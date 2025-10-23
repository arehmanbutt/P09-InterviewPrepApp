import type { Metadata } from "next";
import { Mona_Sans } from "next/font/google";
import "./globals.css";
import Link from "next/link";
import Image from "next/image";
import {
  ClerkProvider,
  SignInButton,
  SignUpButton,
  SignedIn,
  SignedOut,
  UserButton,
} from '@clerk/nextjs'

const monaSans = Mona_Sans({
  variable: "--font-mona-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Interview Prep",
  description: "Prepare for your next interview with confidence",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
    return (
      <ClerkProvider>
        <html lang="en" className="dark">
          <body
            className={`${monaSans.variable} antialiased pattern p-3`}
          >
            <nav className="p-2 flex justify-between items-center gap-4 h-16">
              <Link href="/" className='flex items-center gap-2'>
                <Image src="/logo.svg" alt="Logo" width={38} height={32} />
                <h2 className='text-primary-100'>Interview Prep</h2>
              </Link>
              <div className="flex items-center gap-3">
                <SignedOut>
                  <SignInButton>
                    <button className="px-6 py-2 text-sm font-medium text-primary-100 bg-transparent border border-primary-100 hover:bg-primary-100 hover:text-gray-900 rounded-lg transition-all duration-200 cursor-pointer">
                      Get Started
                    </button>
                  </SignInButton>
                </SignedOut>
                <SignedIn>
                  <UserButton />
                </SignedIn>
              </div>
            </nav>
            {children}
          </body>
        </html>
      </ClerkProvider>
    );
}



