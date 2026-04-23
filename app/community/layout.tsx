import CommunitySidebar from '@/components/CommunitySidebar'

export default function CommunityLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <CommunitySidebar />
      <div className="md:pl-52">
        {children}
      </div>
    </>
  )
}
