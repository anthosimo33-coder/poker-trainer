import { ModuleCatalog } from "@/components/ModuleCatalog";

export default function TheoryPage() {
  return (
    <ModuleCatalog
      eyebrow="Précis théorique"
      title="Théorie"
      subtitle="La leçon de chaque sous-module : concepts clés, pièges, mnémoniques, et le quick check qui débloque le drill. Lis avant de driller."
      mode="theory"
    />
  );
}
