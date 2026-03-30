import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      const allowedEmails = process.env.ALLOWED_EMAILS?.split(",") || [];
      if (user.email && allowedEmails.includes(user.email)) {
        return true;
      }
      return false; // Từ chối nếu không có trong whitelist
    },
    async jwt({ token, account }) {
      // Lưu id_token vào JWT để sau này lấy ra dùng cho API Backend
      if (account) {
        token.id_token = account.id_token;
      }
      return token;
    },
    async session({ session, token }) {
      // Đưa id_token vào session để Frontend có thể truy cập
      (session as any).id_token = token.id_token;
      return session;
    },
  },
  pages: {
    signIn: "/login", // Trang login tùy chỉnh (nếu có) hoặc dùng mặc định
  },
  secret: process.env.NEXTAUTH_SECRET,
};
