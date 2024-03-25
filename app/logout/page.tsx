import { signOut } from "@/auth";
import { Button } from "../ui/button";

export default async function Logout() {
  
  return (
    <div className="flex justify-center items-center">
      <div className="relative w-full">
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
