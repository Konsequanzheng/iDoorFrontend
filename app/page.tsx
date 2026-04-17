import HomeClient from "./page-client";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const bookingId =
    typeof params.bookingId === "string" ? params.bookingId : null;

  return <HomeClient bookingId={bookingId} />;
}
