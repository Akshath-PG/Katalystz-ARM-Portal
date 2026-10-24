import LmsTabs from "@/components/lms/LmsTabs";

export default function LmsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="max-w-7xl mx-auto pb-12">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 font-heading">Learning Management System</h1>
        <p className="text-gray-500 mt-1">Modules, data access and usage restrictions by role.</p>
      </div>
      <LmsTabs />
      {children}
    </div>
  );
}
