'use client';

import { useState, useEffect, useRef } from "react";
import EditingArea from "../../components/EditingArea";
import { isDevelopmentEnvironment } from "@/lib/environment";
import { SignoutButton } from "../../components/SignoutButton";
import { getSessionServer } from "@/lib/getAuth";
import type { ReactElement } from 'react'
import Layout from '@/components/layout'
import type { NextPageWithLayout } from '@/pages/_app'
import type { InferGetServerSidePropsType, GetServerSideProps } from 'next';
import { Session } from 'next-auth';
import { BlockIdsIndexProvider } from "@/_app/context/page-blockids-index-context";
import {
  setUseWhatChange,
} from '@simbathesailor/use-what-changed';
import { 
  initLocalPagesObservable,
  cleanupLocalPagesObservable,
  localPagesRef
} from "@/_app/context/storage/dbPages";

// Only Once in your app you can set whether to enable hooks tracking or not.
// In CRA(create-react-app) e.g. this can be done in src/index.js

setUseWhatChange(process.env.NODE_ENV === 'development');

export const maxDuration = 60;

interface PageProps {
  session: Session | null;
}

export const getServerSideProps: GetServerSideProps<PageProps> = (async ({req, res}) => {
  const session = await getSessionServer(req, res);
  if (!session || !session.id) {
    return {
      props: {
        session: null,
        pages: null
      }
    }
  }
  
  return {
    props: {
      session
    }
  }
});

const Page: NextPageWithLayout<InferGetServerSidePropsType<typeof getServerSideProps>> = ({session}) => {

  const [pagesLoaded, setPagesLoaded] = useState(false);

  useEffect(() => {
    if (session?.id) {
      initLocalPagesObservable(session.id);
      
      const intervalId = setInterval(() => {
        if (localPagesRef.current) {
          setPagesLoaded(true);
          clearInterval(intervalId);
        }
      }, 100);

      return () => {
        clearInterval(intervalId);
        cleanupLocalPagesObservable();
      };
    }
  }, [session]);

  if (!session || !session.id) {
    console.log("Problem with session", session);
    return (
      <div className="flex justify-center items-center">
        <h1>Problem with authentication</h1>
        <SignoutButton />
      </div>
    );
  }

  return (
    <div className="flex justify-center items-center">
      <div className="relative w-full">
        {isDevelopmentEnvironment && (
          <div className="absolute top-0 left-0 bg-red-500 text-white p-0.5">
            dev
          </div>
        )}
          <BlockIdsIndexProvider>
            {pagesLoaded && <EditingArea userId={session.id} />}
          </BlockIdsIndexProvider>
        <SignoutButton />
      </div>
    </div>
  );
}

Page.getLayout = function getLayout(page: ReactElement) {
  return (
    <Layout>
      {page}
    </Layout>
  )
}

export default Page;