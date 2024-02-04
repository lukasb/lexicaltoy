import Editor from "../editor/editor";
import { fetchPages } from "../lib/db";
import { signOut } from '@/auth';
import { Button } from "../ui/button";
import { auth } from "@/auth";
export const maxDuration = 60;

export default async function Home() {
  const session = await auth();
  if (!session || !session.user || !session.user.id) {
    if (session) {
      console.log("Problem with authetication", session);
    }
    return (
      <div className="flex justify-center items-center">
        <h1>Problem with authetication</h1>
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
    );
  }
  
  const initialPage = await fetchPages(session.user.id);
  const initialPageContent = initialPage[0].value;
  const pageId = initialPage[0].id;

  return (
    <div className="flex justify-center items-center">
      <div className="relative w-full">
      <div className="flex flex-col items-start">
        <div className="border-solid border-4 border-indigo-300 rounded-lg m-0 md:m-4 p-7 w-full max-w-7xl">
          <Editor
            initialPageContent={initialPageContent}
            pageId={pageId}
            userId={session.user.id}
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