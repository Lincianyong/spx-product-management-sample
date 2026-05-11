"use client";

import { Markdown } from "@/components/Markdown";

interface Props {
  body: string;
}

export function CommentBody({ body }: Props) {
  return <Markdown source={body} />;
}
