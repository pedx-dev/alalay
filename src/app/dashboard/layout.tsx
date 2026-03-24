import Navbar from "~/components/Navbar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_#f8fafc,_#e2e8f0_40%,_#dbeafe_100%)] text-slate-900 dark:bg-[radial-gradient(circle_at_top_left,_#0f172a,_#111827_45%,_#1e1b4b_100%)]">
      <Navbar mode="dashboard" />
      {children}
    </div>
  );
}
