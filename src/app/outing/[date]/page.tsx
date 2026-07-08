import OutingScreen from "@/components/OutingScreen";

type OutingPageProps = {
  params: { date: string };
};

export default function OutingPage({ params }: OutingPageProps) {
  return <OutingScreen date={params.date} />;
}
