import { Topbar } from "@/components/nav/Topbar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Topbar />
      {children}
    </>
  );
}
