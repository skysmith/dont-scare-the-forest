import RoomClient from './RoomClient';

export const dynamic = 'force-dynamic';

export default async function RoomPage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { code = '' } = await params;
  const resolvedSearch = await searchParams;
  const nameParam = resolvedSearch?.name;
  const displayName = Array.isArray(nameParam) ? nameParam[0] ?? 'Player' : nameParam || 'Player';

  if (!code) {
    return (
      <main className="min-h-screen bg-slate-950 text-emerald-50 flex items-center justify-center">
        <p>No room specified.</p>
      </main>
    );
  }

  return <RoomClient code={code} displayName={displayName} />;
}
