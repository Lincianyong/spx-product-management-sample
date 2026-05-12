import { GuidelineTabs } from "./GuidelineTabs";

export default function GuidelineLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <GuidelineTabs />
      {children}
    </div>
  );
}
