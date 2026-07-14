import RoutineEditorScreen from "@/components/RoutineEditorScreen";

type RoutineEditorPageProps = {
  params: { id: string };
};

export default function RoutineEditorPage({ params }: RoutineEditorPageProps) {
  return <RoutineEditorScreen id={params.id} />;
}
