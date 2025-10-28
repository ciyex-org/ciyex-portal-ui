import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";

const handler = NextAuth({
    providers: [
        GoogleProvider({
            clientId:
                "GOOGLE_CLIENT_ID_PLACEHOLDER",
            clientSecret: "GOOGLE_CLIENT_SECRET_PLACEHOLDER",
        }),
    ],
    secret:
        "NEXTAUTH_SECRET_PLACEHOLDER", // your NEXTAUTH_SECRET
});

export { handler as GET, handler as POST };




// import NextAuth from "next-auth";
// import GoogleProvider from "next-auth/providers/google";
//
// const handler = NextAuth({
//     providers: [
//         GoogleProvider({
//             clientId: process.env.GOOGLE_CLIENT_ID!,
//             clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
//         }),
//     ],
//     secret: process.env.NEXTAUTH_SECRET,
// });
//
// export { handler as GET, handler as POST };
