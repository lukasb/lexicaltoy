import { fetchPages } from "../lib/db";
import { Button } from "../ui/button";
import { auth } from "@/auth";
import EditingArea from "./EditingArea";
import { signOut } from "@/auth";
import { isDevelopmentEnvironment } from "../lib/environment";

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

  const pages = await fetchPages(session.user.id);

  return (
    <div className="flex justify-center items-center">
      <div className="relative w-full">
        {isDevelopmentEnvironment && (
          <div className="absolute top-0 left-0 bg-red-500 text-white p-2">
            Debug
          </div>
        )}
        <EditingArea pages={pages} userId={session.user.id} />
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
