import { redirect } from "next/navigation";

// The dashboard is gone — drop users straight onto a tool.
export default function Page() {
  redirect("/organize/merge");
}
