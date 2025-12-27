"use client";

import { SignedIn, SignedOut, SignInButton, SignUpButton } from "@clerk/nextjs";
import { MainLayout } from "@/components/layout/MainLayout";

export default function Home() {
  return (
    <main className="h-screen bg-gray-100">
      <SignedOut>
        <div className="flex items-center justify-center h-full">
          <div className="text-center border-2 border-black bg-white p-12 shadow-[8px_8px_0px_0px_#000]">
            <h2 className="text-3xl font-bold mb-4">Bienvenido a Tectramin</h2>
            <p className="text-gray-600 mb-6">Inicia sesión para acceder al panel</p>
            <div className="flex gap-4 justify-center">
              <SignInButton mode="modal">
                <button className="px-6 py-3 border-2 border-black font-bold hover:bg-gray-100 transition-colors">
                  Iniciar Sesión
                </button>
              </SignInButton>
              <SignUpButton mode="modal">
                <button className="px-6 py-3 bg-blue-500 text-white border-2 border-black font-bold hover:bg-blue-600 transition-colors">
                  Registrarse
                </button>
              </SignUpButton>
            </div>
          </div>
        </div>
      </SignedOut>
      <SignedIn>
        <MainLayout />
      </SignedIn>
    </main>
  );
}
