import Image from "next/image";
import LoginForm from "./LoginForm";

export default function LoginPage() {
  return (
    <div
      className="flex min-h-screen w-full items-center justify-center p-4"
      style={{
        background:
          "radial-gradient(circle at center, var(--color-gardner-azul) 0%, var(--color-gardner-azul-oscuro) 100%)",
      }}
    >
      <main className="w-full max-w-md">
        <div className="flex flex-col gap-6 rounded-xl border border-white/20 bg-white/95 p-8 shadow-[0_8px_32px_rgba(0,0,0,0.25)] backdrop-blur-md sm:p-10">
          <div className="flex flex-col items-center gap-3 text-center">
            <Image
              src="/img/logo-sag.png"
              alt="SAG · Sistema de Acceso Gardner"
              width={120}
              height={120}
              priority
              className="h-24 w-24 object-contain"
            />
            <h1 className="text-2xl font-bold text-gardner-azul-oscuro">Bienvenido</h1>
            <p className="text-sm text-gardner-gris/60">Inicie sesión para acceder al sistema</p>
          </div>
          <LoginForm />
          <div className="text-center">
            <p className="text-xs text-gardner-gris/50">
              ¿Necesita ayuda? Contacte a{" "}
              <span className="font-medium text-gardner-azul">Soporte Técnico</span>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
