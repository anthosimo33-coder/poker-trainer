import { ModuleCatalog } from "@/components/ModuleCatalog";

export default function DrillIndexPage() {
  return (
    <ModuleCatalog
      eyebrow="Entraînement"
      title="Drill"
      subtitle="Choisis un sous-module à travailler. Si la théorie n'est pas encore validée, le drill t'y renvoie d'abord — sinon tu enchaînes une session de 20 spots."
      mode="drill"
    />
  );
}
