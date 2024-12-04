import { Button } from "@/_app/ui/button";
import { signOut } from "next-auth/react";
import { localDb } from "@/_app/context/storage/db";
import { useState } from "react";

export const SignoutButton = () => {
  const [buttonText, setButtonText] = useState("Sign Out");

  const handleClick = async () => {
    try {
      setButtonText("Clearing data...");
      await localDb.delete();
      setButtonText("Signing out...");
      signOut();
    } catch (e) {
      alert("Error deleting local db: " + e);
      setButtonText("Sign Out");
    }
  };

  return (
    <Button onClick={handleClick}>
      <div>{buttonText}</div>
    </Button>
  );
}
