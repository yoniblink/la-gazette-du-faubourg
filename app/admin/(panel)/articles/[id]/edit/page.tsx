import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

type Props = { params: Promise<{ id: string }> };

export default async function EditArticlePage({ params }: Props) {
  const { id } = await params;
  const row = await prisma.article.findUnique({
    where: { id },
    include: { category: { select: { slug: true } } },
  });
  if (!row) notFound();

  redirect(`/${row.category.slug}/${row.slug}?edit=1`);
}
