import { OtpSignIn } from './OtpSignIn';

export default async function CustomerSignInPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return (
    <div className="flex min-h-[80vh] items-center justify-center">
      <OtpSignIn slug={slug} />
    </div>
  );
}
