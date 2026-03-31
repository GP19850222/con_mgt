from fastapi import FastAPI, Depends, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel
from typing import List, Optional
from datetime import date
import pandas as pd
import duckdb
import os
import io
from dotenv import load_dotenv

import requests
import xml.etree.ElementTree as ET
from dependencies import get_current_user

from contextlib import asynccontextmanager

# ================================
# KHỞI TẠO APP & CONFIG
# ================================
load_dotenv()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # STARTUP: Tải dữ liệu từ Google Sheet vào RAM
    DataLoader.load_all()
    yield
    # SHUTDOWN (Nếu cần)

app = FastAPI(
    title="Contract Revenue Dashboard API",
    description="Backend Decoupled từ Streamlit sang FastAPI",
    version="1.0.0",
    lifespan=lifespan
)

# CORS: URL của Frontend Vercel (Lấy từ biến môi trường)
allowed_origins = os.getenv("ALLOWED_ORIGINS", "*").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ================================
# PYDANTIC MODELS (Bộ Lọc)
# ================================
class FilterParams(BaseModel):
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    selected_customers: Optional[List[str]] = []
    selected_floors: Optional[List[str]] = []
    
    # Cross-filtering từ Echarts
    sel_years: Optional[List[int]] = []
    sel_months: Optional[List[str]] = []
    sel_custs: Optional[List[str]] = []
    sel_floors: Optional[List[str]] = []
    sel_rev_type: Optional[List[str]] = []


# ================================
# DUCKDB DATA LOADER
# ================================
class DataLoader:
    _df_raw = None
    _df_master_detail = None
    _df_current_price = None

    @classmethod
    def load_all(cls):
        """Tải dữ liệu trực tiếp từ Google Sheet vào RAM."""
        try:
            print("--- Đang tải dữ liệu từ Google Sheet (Vào RAM)... ---")
            sheet_id = os.getenv("GOOGLE_SHEET_ID")
            creds_json = os.getenv("GOOGLE_SERVICE_ACCOUNT_JSON")

            if not sheet_id or not creds_json:
                print("Lỗi: Thiếu GOOGLE_SHEET_ID hoặc GOOGLE_SERVICE_ACCOUNT_JSON trong biến môi trường.")
                return

            import json
            from google.oauth2 import service_account
            import requests

            # Đọc credentials service account
            creds_auth = service_account.Credentials.from_service_account_info(
                json.loads(creds_json), scopes=['https://www.googleapis.com/auth/drive.readonly']
            )

            # Phải lấy Access Token từ creds
            from google.auth.transport.requests import Request
            creds_auth.refresh(Request())

            # URL tải định dạng xlsx
            url = f"https://www.googleapis.com/drive/v3/files/{sheet_id}/export?mimeType=application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            headers = {"Authorization": f"Bearer {creds_auth.token}"}
            
            response = requests.get(url, headers=headers, timeout=60)
            if response.status_code != 200:
                print(f"Lỗi tải file từ Google API: {response.text}")
                return
            
            # Đọc vào memory bằng io.BytesIO
            excel_data = io.BytesIO(response.content)
            all_sheets = pd.read_excel(excel_data, sheet_name=None)
            df_info = all_sheets.get('ContractInfo')
            df_rev = all_sheets.get('RevEst')

            if df_info is None or df_rev is None:
                raise ValueError("Bảng ContractInfo hoặc RevEst không tồn tại trong file Google Sheet.")
                
            cls._df_raw = cls._load_and_process_data(df_info, df_rev)
            cls._df_master_detail = cls._load_contract_table_data(df_info, df_rev)
            cls._df_current_price = cls._load_current_price_data(df_info, df_rev)
            print(f"Đã load data thành công vào RAM: Raw({len(cls._df_raw)}), Master({len(cls._df_master_detail)}), Current({len(cls._df_current_price)})")
        except Exception as e:
            print(f"Lỗi khi load_all: {e}")
            import traceback
            traceback.print_exc()

    @staticmethod
    def _load_and_process_data(df_info: pd.DataFrame, df_rev: pd.DataFrame) -> pd.DataFrame:
        query = """
        WITH base_data AS (
            SELECT 
                ci.short_name, ci.customer, ci.contract_no, ci.contract_help, ci.from, ci.to, ci.floor, cast(ci.area as double) as area,
                re.beg_effect_price, re.end_effect_price, cast(re.rent_price as double) as rent_price, cast(re.ser_price as double) as ser_price,
                (cast(re.rent_price as double) * cast(ci.area as double)) as base_rent_rev,
                (cast(re.ser_price as double) * cast(ci.area as double)) as base_ser_rev,
                ci.expire, ci.expired_date
            FROM df_info ci
            JOIN df_rev re ON ci.contract_help = re.contract_help
        ),
        actual_end_dates AS (
            SELECT *,
                CASE WHEN upper(expire) = 'Y' AND expired_date IS NOT NULL 
                     THEN LEAST(end_effect_price::TIMESTAMP, expired_date::TIMESTAMP)
                     ELSE end_effect_price::TIMESTAMP 
                END as actual_end_effect_price
            FROM base_data
        ),
        months AS (
            SELECT *,
                UNNEST(GENERATE_SERIES(
                    date_trunc('month', beg_effect_price::TIMESTAMP), 
                    date_trunc('month', actual_end_effect_price), 
                    INTERVAL 1 MONTH
                )) as rev_month_start
            FROM actual_end_dates
            WHERE beg_effect_price::TIMESTAMP <= actual_end_effect_price
        ),
        daily_calc AS (
            SELECT *,
                last_day(rev_month_start) as rev_month_end,
                greatest(beg_effect_price::DATE, rev_month_start::DATE) as eff_start,
                least(actual_end_effect_price::DATE, last_day(rev_month_start)::DATE) as eff_end
            FROM months
        ),
        final_calc AS (
            SELECT short_name, customer, contract_no, contract_help, floor, area,
                rev_month_start::DATE as month_date, year(rev_month_start) as year, month(rev_month_start) as month,
                date_diff('day', eff_start, eff_end) + 1 as active_days,
                day(rev_month_end) as days_in_month, base_rent_rev, base_ser_rev,
                round(base_rent_rev * (date_diff('day', eff_start, eff_end) + 1.0) / day(rev_month_end), 0) as rent_rev,
                round(base_ser_rev * (date_diff('day', eff_start, eff_end) + 1.0) / day(rev_month_end), 0) as ser_rev
            FROM daily_calc
            WHERE eff_start <= eff_end
        )
        SELECT *, (rent_rev + ser_rev) as total_rev
        FROM final_calc ORDER BY year, month, short_name
        """
        res = duckdb.query(query).df()
        res['year'] = res['year'].astype(int)
        res['month'] = res['month'].astype(int)
        res['month_year_sort'] = res['year'].astype(str) + '-' + res['month'].astype(str).str.zfill(2)
        res['month_year'] = res['month'].astype(str).str.zfill(2) + '/' + res['year'].astype(str)
        return res

    @staticmethod
    def _load_contract_table_data(df_info: pd.DataFrame, df_rev: pd.DataFrame) -> pd.DataFrame:
        query = """
        WITH base_data AS (
            SELECT ci.short_name, ci.customer, ci.contract_no, ci.contract_help,
                cast(ci.from as string) as "from", cast(ci.to as string) as "to",
                cast(ci.floor as string) as floor, cast(ci.area as double) as area,
                cast(re.beg_effect_price as string) as beg_effect_price,
                cast(re.end_effect_price as string) as end_effect_price,
                cast(re.rent_price as double) as rent_price, cast(re.ser_price as double) as ser_price,
                (cast(re.rent_price as double) * cast(ci.area as double)) as base_rent_rev,
                (cast(re.ser_price as double) * cast(ci.area as double)) as base_ser_rev,
                ci.expire, cast(ci.expired_date as string) as expired_date
            FROM df_info ci JOIN df_rev re ON ci.contract_help = re.contract_help
        ),
        actual_end_dates AS (
            SELECT *,
                CASE WHEN upper(expire) = 'Y' AND expired_date IS NOT NULL THEN LEAST(end_effect_price::TIMESTAMP, expired_date::TIMESTAMP)
                ELSE end_effect_price::TIMESTAMP END as actual_end_effect_price
            FROM base_data
        ),
        months AS (
            SELECT *, UNNEST(GENERATE_SERIES(date_trunc('month', beg_effect_price::TIMESTAMP), date_trunc('month', actual_end_effect_price), INTERVAL 1 MONTH)) as rev_month_start
            FROM actual_end_dates WHERE beg_effect_price::TIMESTAMP <= actual_end_effect_price
        ),
        daily_calc AS (
            SELECT *, last_day(rev_month_start) as rev_month_end,
                greatest(beg_effect_price::DATE, rev_month_start::DATE) as eff_start,
                least(actual_end_effect_price::DATE, last_day(rev_month_start)::DATE) as eff_end
            FROM months
        ),
        month_calc AS (
            SELECT short_name, customer, contract_no, contract_help, "from", "to", floor, area,
                beg_effect_price, end_effect_price, rent_price, ser_price, expire, expired_date,
                round(base_rent_rev * (date_diff('day', eff_start, eff_end) + 1.0) / day(rev_month_end), 0) as rent_rev,
                round(base_ser_rev  * (date_diff('day', eff_start, eff_end) + 1.0) / day(rev_month_end), 0) as ser_rev
            FROM daily_calc WHERE eff_start <= eff_end
        ),
        period_agg AS (
            SELECT short_name, customer, contract_no, contract_help, "from", "to", floor, area,
                beg_effect_price, end_effect_price, rent_price, ser_price, expire, expired_date,
                SUM(rent_rev) as rent_rev, SUM(ser_rev) as ser_rev, SUM(rent_rev + ser_rev) as total_rev
            FROM month_calc GROUP BY 1,2,3,4,5,6,7,8,9,10,11,12,13,14
        )
        SELECT * FROM period_agg ORDER BY short_name, contract_no, beg_effect_price::DATE
        """
        return duckdb.query(query).df()

    @staticmethod
    def _load_current_price_data(df_info: pd.DataFrame, df_rev: pd.DataFrame) -> pd.DataFrame:
        query = """
        WITH base_data AS (
            SELECT ci.contract_help, ci.customer, ci.short_name, cast(ci.floor as string) as floor, cast(ci.area as double) as area,
                re.beg_effect_price, re.end_effect_price, cast(re.rent_price as double) as rent_price, cast(re.ser_price as double) as ser_price,
                ci.expire, ci.expired_date
            FROM df_info ci LEFT JOIN df_rev re ON ci.contract_help = re.contract_help
        )
        SELECT * FROM base_data
        WHERE 
            (CURRENT_DATE >= try_cast(beg_effect_price as DATE) AND CURRENT_DATE <= 
                CASE WHEN upper(expire) = 'Y' AND expired_date IS NOT NULL THEN LEAST(try_cast(end_effect_price as TIMESTAMP), try_cast(expired_date as TIMESTAMP))
                ELSE try_cast(end_effect_price as TIMESTAMP) END)
            OR lower(short_name) = 'n/a' OR lower(customer) LIKE '%trống%'
        """
        return duckdb.query(query).df()

    @classmethod
    def get_raw_data(cls):
        if cls._df_raw is None:
            cls.load_all()
        return cls._df_raw

# Helper fetch VCB XML
def get_vcb_exchange_rate() -> float:
    url = "https://portal.vietcombank.com.vn/Usercontrols/TVPortal.TyGia/pXML.aspx"
    try:
        response = requests.get(url, timeout=10)
        tree = ET.fromstring(response.content)
        for exrate in tree.findall('Exrate'):
            if exrate.get('CurrencyCode') == 'USD':
                # Tiêu chuẩn lấy giá Sell (Bán ra) theo yêu cầu người dùng
                sell_val = exrate.get('Sell').replace(',', '')
                return float(sell_val)
    except Exception as e:
        print(f"Lỗi lấy tỷ giá VCB: {e}")
    return 26355.0 # Mặc định theo hình mẫu nếu lỗi

# Utility hàm filter dữ liệu
def apply_filters(df_in: pd.DataFrame, filters: FilterParams, exclude: list = []) -> pd.DataFrame:
    if df_in is None or df_in.empty:
        return pd.DataFrame()
        
    df_out = df_in.copy()
    
    # Lọc Sidebar
    if filters.start_date and filters.end_date and 'month_date' in df_out.columns:
        start_period = pd.to_datetime(filters.start_date).replace(day=1).date()
        end_period = (pd.to_datetime(filters.end_date) + pd.offsets.MonthEnd(0)).date()
        df_out['month_date_dt'] = pd.to_datetime(df_out['month_date']).dt.date
        df_out = df_out[(df_out['month_date_dt'] >= start_period) & (df_out['month_date_dt'] <= end_period)]
        df_out = df_out.drop(columns=['month_date_dt'])

    if filters.selected_customers and 'customer' in df_out.columns:
        df_out = df_out[df_out['customer'].isin(filters.selected_customers)]
        
    if filters.selected_floors and 'floor' in df_out.columns:
        df_out = df_out[df_out['floor'].isin(filters.selected_floors)]

    # Lọc Động (Cross-filtering)
    if 'year' not in exclude and filters.sel_years and 'year' in df_out.columns:
        df_out = df_out[df_out['year'].isin(filters.sel_years)]
        
    if 'month' not in exclude and filters.sel_months and 'month_year_sort' in df_out.columns:
        df_out = df_out[df_out['month_year_sort'].isin(filters.sel_months)]
        
    if 'cust' not in exclude and filters.sel_custs and 'short_name' in df_out.columns:
        df_out = df_out[df_out['short_name'].isin(filters.sel_custs)]
        
    if 'floor' not in exclude and filters.sel_floors and 'floor' in df_out.columns:
        df_out = df_out[df_out['floor'].isin(filters.sel_floors)]
    
    # Lọc Nguồn Thu
    if 'rev_type' not in exclude and filters.sel_rev_type and 'rent_rev' in df_out.columns:
        is_rent = any(x in filters.sel_rev_type for x in ["Phí thuê văn phòng", "Thuê VP Cơ Bản"])
        is_ser = any(x in filters.sel_rev_type for x in ["Phí Dịch vụ cố định", "Phí Dịch Vụ Mở Rộng"])
        if is_rent and not is_ser:
            df_out['ser_rev'] = 0
            df_out['total_rev'] = df_out['rent_rev']
        elif is_ser and not is_rent:
            df_out['rent_rev'] = 0
            df_out['total_rev'] = df_out['ser_rev']

    return df_out


# ================================
# API ENDPOINTS
# ================================
@app.post("/api/dashboard/refresh", dependencies=[Depends(get_current_user)])
def refresh_data():
    """Tải lại Data từ Google Sheet vào RAM thủ công khi được gọi"""
    try:
        DataLoader.load_all()
        return {"status": "success", "message": "Đã tải lại dữ liệu từ Google Sheet vào RAM"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi xảy ra: {e}")

@app.get("/health")
def healthcheck():
    return {"status": "ok"}

@app.get("/api/dashboard/filters", dependencies=[Depends(get_current_user)])
def get_filter_options():
    df = DataLoader.get_raw_data()
    if df is None or df.empty:
        return {"customers": [], "floors": []}
        
    customers = sorted(df['customer'].unique().tolist())
    floors = sorted(df['floor'].astype(str).unique().tolist())
    
    return {
        "customers": customers,
        "floors": floors
    }

@app.post("/api/dashboard/kpi", dependencies=[Depends(get_current_user)])
def get_kpi_metrics(filters: FilterParams):
    df_raw = DataLoader.get_raw_data()
    # 1. Tổng doanh thu (VNĐ) - Dùng raw filtered
    filtered_df = apply_filters(df_raw, filters)
    
    # 2. Thống kê giá (USD/m2) - Dùng df_current_price
    df_curr = DataLoader._df_current_price
    df_price_filtered = apply_filters(df_curr, filters)
    fx_rate = get_vcb_exchange_rate()

    if df_price_filtered is not None and not df_price_filtered.empty:
        # Tính USD/m2
        df_price_filtered = df_price_filtered.copy()
        df_price_filtered['rent_usd'] = pd.to_numeric(df_price_filtered['rent_price'], errors='coerce').fillna(0) / fx_rate
        df_price_filtered['ser_usd'] = pd.to_numeric(df_price_filtered['ser_price'], errors='coerce').fillna(0) / fx_rate
        
        # Chỉ tính trên diện tích đang có khách (giá > 0)
        df_occupied = df_price_filtered[df_price_filtered['rent_usd'] > 0]
        
        rent_stats = {
            "max": float(df_occupied['rent_usd'].max()) if not df_occupied.empty else 0,
            "min": float(df_occupied['rent_usd'].min()) if not df_occupied.empty else 0,
            "avg": float(df_occupied['rent_usd'].mean()) if not df_occupied.empty else 0
        }
        ser_stats = {
            "max": float(df_occupied['ser_usd'].max()) if not df_occupied.empty else 0,
            "min": float(df_occupied['ser_usd'].min()) if not df_occupied.empty else 0,
            "avg": float(df_occupied['ser_usd'].mean()) if not df_occupied.empty else 0
        }
    else:
        rent_stats = {"max": 0, "min": 0, "avg": 0}
        ser_stats = {"max": 0, "min": 0, "avg": 0}

    return {
        "total_rent": float(filtered_df['rent_rev'].sum()) if not filtered_df.empty else 0,
        "total_ser": float(filtered_df['ser_rev'].sum()) if not filtered_df.empty else 0,
        "total_all": float(filtered_df['total_rev'].sum()) if not filtered_df.empty else 0,
        "rent_stats": rent_stats,
        "ser_stats": ser_stats,
        "fx_rate": fx_rate
    }

@app.post("/api/dashboard/charts", dependencies=[Depends(get_current_user)])
def get_charts_data(filters: FilterParams):
    df = DataLoader.get_raw_data()
    if df is None or df.empty:
        return {
            "yearly_revenue": [], "monthly_revenue": [], "top_customers": [],
            "revenue_structure": {"rent": 0, "service": 0},
            "floor_donut": [], "floor_dist": [], "max_rent_usd": 0
        }
        
    # Chart Doanh Thu Năm (exclude 'year' filter per UI logic)
    df_yr = apply_filters(df, filters, exclude=['year'])
    yearly_df = df_yr.groupby('year', as_index=False)['total_rev'].sum().to_dict(orient="records")
    
    # Chart Doanh Thu Tháng 
    df_mo = apply_filters(df, filters, exclude=['month'])
    monthly_df = df_mo.groupby('month_year_sort', as_index=False)['total_rev'].sum().to_dict(orient="records")
    
    # Chart Khách Hàng
    df_cu = apply_filters(df, filters, exclude=['cust'])
    top_cust = df_cu.groupby('short_name', as_index=False)[['rent_rev', 'ser_rev']].sum()
    top_cust['total'] = top_cust['rent_rev'] + top_cust['ser_rev']
    top_cust = top_cust.sort_values('total', ascending=True).tail(15).to_dict(orient="records")
    
    # Cơ cấu nguồn thu
    df_st = apply_filters(df, filters, exclude=['rev_type'])
    struct_rent = df_st['rent_rev'].sum()
    struct_ser  = df_st['ser_rev'].sum()

    # Tỷ trọng theo tầng (Donut)
    df_fl = apply_filters(df, filters, exclude=['floor'])
    floor_donut = df_fl.groupby('floor', as_index=False)['total_rev'].sum().sort_values('total_rev', ascending=False)

    # Phân bổ tầng (Visual map)
    df_curr = DataLoader._df_current_price if DataLoader._df_current_price is not None else pd.DataFrame()
    
    floor_dist = []
    max_rent_usd = 0
    if not df_curr.empty and 'area' in df_curr.columns:
        df_dist = df_curr.copy()
        df_dist['area'] = pd.to_numeric(df_dist['area'], errors='coerce').fillna(0)
        df_dist['rent_price'] = pd.to_numeric(df_dist['rent_price'], errors='coerce').fillna(0)
        df_dist['ser_price'] = pd.to_numeric(df_dist['ser_price'], errors='coerce').fillna(0)
        
        current_fx_rate = get_vcb_exchange_rate()
        df_dist['rental_usd'] = df_dist['rent_price'] / current_fx_rate
        df_dist['service_usd'] = df_dist['ser_price'] / current_fx_rate
        df_dist['total_usd'] = df_dist['rental_usd'] + df_dist['service_usd']
        
        # Max rent of ALL occupied spaces (for consistent scale)
        max_rent_usd = float(df_dist[df_dist['rental_usd'] > 0]['rental_usd'].max()) if not df_dist.empty else 1
        
        # Calculate floor totals BEFORE customer filter to keep normalized_sqr correct
        floor_totals = df_dist.groupby('floor')['area'].sum()
        df_dist['normalized_sqr'] = df_dist.apply(
            lambda x: (x['area'] / floor_totals[x['floor']]) if floor_totals.get(x['floor'], 0) > 0 else 0, axis=1
        )
        
        # Apply labels for "Filtered" space
        def label_customer(row):
            # Check if this row matches the filters
            is_match = True
            if filters.selected_customers and row['customer'] not in filters.selected_customers:
                is_match = False
            if filters.sel_custs and row['short_name'] not in filters.sel_custs:
                is_match = False
            if filters.selected_floors and str(row['floor']) not in filters.selected_floors:
                is_match = False
            if filters.sel_floors and str(row['floor']) not in filters.sel_floors:
                is_match = False
                
            if is_match:
                return row['short_name']
            else:
                return "Filtered"

        df_dist['display_name'] = df_dist.apply(label_customer, axis=1)
        
        # Group by floor and display_name to merge filtered areas
        df_agg = df_dist.groupby(['floor', 'display_name'], as_index=False).agg({
            'customer': 'first', # Keep one for reference
            'area': 'sum',
            'rental_usd': 'max', # Keep max rent for coloring
            'service_usd': 'max',
            'total_usd': 'max',
            'normalized_sqr': 'sum'
        })
        
        # Rename display_name to short_name for compatibility
        df_agg = df_agg.rename(columns={'display_name': 'short_name'})
        
        floor_dist = df_agg[['short_name', 'customer', 'floor', 'area', 'rental_usd', 'service_usd', 'total_usd', 'normalized_sqr']].to_dict(orient='records')

    return {
        "yearly_revenue": yearly_df,
        "monthly_revenue": monthly_df,
        "top_customers": top_cust,
        "revenue_structure": {
            "rent": float(struct_rent),
            "service": float(struct_ser)
        },
        "floor_donut": floor_donut.to_dict(orient="records"),
        "floor_dist": floor_dist,
        "max_rent_usd": max_rent_usd
    }

@app.post("/api/dashboard/grid", dependencies=[Depends(get_current_user)])
def get_grid_data(filters: FilterParams):
    # Lấy df_master_detail từ DataLoader
    if DataLoader._df_master_detail is None:
        DataLoader.load_all()
    df = DataLoader._df_master_detail
    if df is None or df.empty:
        return []
        
    df_md = df.copy()
    
    # 1. Date Filters & Basic Filters
    if filters.selected_customers:
        df_md = df_md[df_md['customer'].isin(filters.selected_customers)]
    if filters.selected_floors:
        df_md = df_md[df_md['floor'].isin(filters.selected_floors)]

    # 2. Cross-filtering từ Echarts
    if filters.sel_custs:
        df_md = df_md[df_md['short_name'].isin(filters.sel_custs)]
    if filters.sel_floors:
        df_md = df_md[df_md['floor'].isin(filters.sel_floors)]

    if df_md.empty:
        return []

    try:
        # Create helper column for grouping if missing
        if 'short_name_customer' not in df_md.columns:
            df_md['short_name_customer'] = df_md['short_name'].astype(str) + " - " + df_md['customer'].astype(str)

        # Nhóm dữ liệu (Group level 2) để build master-detail như cũ
        import json
        cols_lvl3 = ['beg_effect_price', 'end_effect_price', 'rent_price', 'ser_price', 'rent_rev', 'ser_rev', 'total_rev']
        group_lvl2 = ['short_name_customer', 'contract_no', 'contract_help', 'floor', 'area', 'expire', 'expired_date']

        # Ensure all grouping columns are strings to avoid float/None comparison issues
        for col in group_lvl2:
            if col in df_md.columns:
                df_md[col] = df_md[col].fillna('').astype(str)

        def get_details(group):
            return json.dumps(group[cols_lvl3].to_dict('records'))

        details_lvl3 = df_md.groupby(group_lvl2, dropna=False).apply(get_details).reset_index(name='details')
        df_lvl2_agg = df_md.groupby(group_lvl2, dropna=False, as_index=False)[['rent_rev', 'ser_rev', 'total_rev']].sum()
        df_lvl2 = pd.merge(df_lvl2_agg, details_lvl3, on=group_lvl2)

        return df_lvl2.to_dict(orient="records")
    except Exception as e:
        print(f"Error in get_grid_data: {e}")
        import traceback
        traceback.print_exc()
        return []

@app.post("/api/dashboard/export", dependencies=[Depends(get_current_user)])
def export_excel(filters: FilterParams):
    df_raw = DataLoader.get_raw_data()
    filtered_df = apply_filters(df_raw, filters)
    
    if filtered_df is None or filtered_df.empty:
        raise HTTPException(status_code=404, detail="Không có dữ liệu để xuất")

    # Chọn và sắp xếp các cột theo mẫu Streamlit
    display_df = filtered_df[[
        'short_name', 'customer', 'contract_no', 'floor',
        'month_year', 'year', 'month',
        'area', 'active_days', 'days_in_month',
        'rent_rev', 'ser_rev', 'total_rev'
    ]].copy()

    # Tạo file Excel trong memory
    output = io.BytesIO()
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        display_df.to_excel(writer, index=False, sheet_name='Doanh Thu HĐ')
        ws = writer.sheets['Doanh Thu HĐ']
        # Auto-adjust column width
        for col in ws.columns:
            max_len = max((len(str(cell.value)) if cell.value else 0) for cell in col)
            ws.column_dimensions[col[0].column_letter].width = min(max_len + 4, 50)

    output.seek(0)
    
    filename = f"Bao_cao_doanh_thu_{pd.Timestamp.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
