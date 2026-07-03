export default function WidgetTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-3 pb-1.5 border-b-2 border-accent">
      <h3 className="text-[11px] font-black text-white uppercase tracking-[0.15em]">{children}</h3>
    </div>
  )
}
