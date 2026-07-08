export default function Header() {
  return (
    <header
      className="flex flex-col items-center gap-1 px-5 pb-6 pt-10 text-center"
      style={{ paddingTop: "max(2.5rem, env(safe-area-inset-top))" }}
    >
      <h1 className="text-2xl font-bold tracking-tight text-primary">Routie</h1>
      <p className="text-sm text-muted-foreground">하루 일정을 더 쉽게</p>
    </header>
  );
}
