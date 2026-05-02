export default function FallBackPage() {
  return (
    < div className="flex h-screen items-center justify-center bg-[#F8F4E3]" >
      <div className="rounded-xl border border-[#E9E2C8] bg-white px-8 py-6 text-center shadow">
        <h1 className="mb-2 text-2xl font-bold text-[#5E503F]">
          404 – Page not found
        </h1>
        <p className="mb-4 text-sm text-[#5E503F]/70">
          The page you are looking for doesn&apos;t exist.
        </p>
        <a
          href="/dashboard"
          className="rounded-md bg-[#2A9D8F] px-4 py-2 text-sm font-medium text-white hover:bg-[#247B71]"
        >
          Go to Dashboard
        </a>
      </div>
    </div >
  );
}