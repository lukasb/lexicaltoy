import { Button } from "@/_app/ui/button";
import { signOut } from "next-auth/react";
import { localDb } from "@/_app/context/storage/db";

export const SignoutButton = () => {
  const handleClick = async () => {
    try {
      await localDb.delete();
    } catch (e) {
      alert("Error deleting local db: " + e);
    }
    signOut();
  };
  return (
    <Button onClick={handleClick}>
      <div>Sign Out</div>
    </Button>
  );
}
