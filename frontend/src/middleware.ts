import { withAuth } from "next-auth/middleware";

export default withAuth({
  callbacks: {
    authorized: ({ token }) => !!token,
  },
});

// Chỉ bảo vệ trang Dashboard (root) và các route nội bộ khác
export const config = { matcher: ["/"] };
