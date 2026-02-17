import RoomClient from './RoomClient';

export const dynamic = 'force-dynamic';

export default function RoomPage({
  params,
  searchParams,
}: {
  params: { code: string };
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const code = params?.code || '';
  const nameParam = searchParams?.name;
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
