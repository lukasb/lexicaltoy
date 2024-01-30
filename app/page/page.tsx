import Editor from "../editor/editor";
import { fetchPages } from "../lib/db";
import { signOut } from '@/auth';
import { Button } from "../ui/button";

export const maxDuration = 60;

export default async function Home() {
  const userId = "410544b2-4001-4271-9855-fec4b6a6442a";
  const initialPage = await fetchPages(userId);
  const initialPageContent = initialPage[0].value;
  const pageId = initialPage[0].id;

  return (
    <div className="flex justify-center items-center">
      <div className="relative w-full">
      <div className="flex flex-col items-start">
        <div className="border-solid border-4 border-indigo-300 rounded-lg m-4 p-7 w-full max-w-7xl">
          <Editor
            initialPageContent={initialPageContent}
            pageId={pageId}
            userId={userId}
          />
        </div>
      </div>
      <form
      action={async () => {
        "use server";
        await signOut();
      }}
    >
      <Button className="m-4">
        <div>Sign Out</div>
      </Button>
    </form>
    </div>
    </div>
  );
}