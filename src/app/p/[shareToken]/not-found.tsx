import Link from 'next/link'

export default function ProfileNotFound() {
  return (
    <div className="min-h-screen bg-[#F8F9FC] flex flex-col items-center justify-center px-6">
      <span className="text-6xl mb-4">{'\u{1F30D}'}</span>
      <h1 className="text-2xl font-bold text-[#0A0A0A] mb-2">Profile Not Found</h1>
      <p className="text-sm text-[#999] text-center max-w-xs mb-8">
        This profile may have been unpublished or the link is incorrect.
      </p>
      <Link
        href="https://evrywher.io"
        className="bg-[#4F46E5] hover:bg-[#4338CA] text-white font-semibold px-6 py-3 rounded-xl transition-colors no-underline"
      >
        Go to Evrywher
      </Link>
    </div>
  )
}
