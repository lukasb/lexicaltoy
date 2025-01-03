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
import { MiniSearchProvider } from "@/_app/context/minisearch-context";
import { useLiveQuery } from 'dexie-react-hooks';
import { localDb } from '@/_app/context/storage/db';
import { PageStatusProvider } from "@/_app/context/page-update-context";

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

  const pagesCount = useRef(-1);

  const pages = useLiveQuery(async () => {

    if (!session || !session.id) return [];

    console.log("useLiveQuery", session.id);

    try {

      //console.log("getting localPages for ", session.id);
      //console.log("localDb", localDb.isOpen());
      //console.log("localDb.pages", localDb.pages);
      //console.log("localDb.queuedUpdates", localDb.queuedUpdates);

      const localPages = await localDb.pages
        .where("userId")
        .equals(session.id)
        .toArray();

      //console.log("getting queuedUpdates for ", session.id);

      const queuedUpdates = await localDb.queuedUpdates
        .where("userId")
        .equals(session.id)
        .toArray();

      if (!localPages || !queuedUpdates) {
        if (!localPages) console.error("localPages not found");
        if (!queuedUpdates) console.error("queuedUpdates not found");
        return undefined;
      }

      //console.log("localPages", localPages);
      //console.log("queuedUpdates", queuedUpdates);

      const mergedPages = [
        ...localPages
          // remove deleted pages
          .filter((page) => !page.deleted)
          // remove pages with queued updates marking them as deleted
          .filter((page) => {
            const queuedUpdate = queuedUpdates.find(
              (update) => update.id === page.id
            );
            return !queuedUpdate?.deleted;
          })
          // replace with queued updates if they exist
          .map((page) => {
            const queuedUpdate = queuedUpdates.find(
              (update) => update.id === page.id
            );
            return queuedUpdate || page;
          }),
        // add queued updates that aren't in the main table
        ...queuedUpdates.filter(
          (update) =>
            !localPages.some((page) => page.id === update.id) && !update.deleted
        ),
      ];
      /*console.log("mergedPages", mergedPages);
      mergedPages.forEach((page, index) => {
        console.log(`Page ${index}:`, page);
      });*/
      return mergedPages;
    } catch (error) {
      console.error("error getting localPages or queuedUpdates", error);
      return undefined;
    }
  }, [session]);

  /*useEffect(() => {
    if (pagesCount.current !== pages?.length) {
      pagesCount.current = pages?.length || 0;
      console.log("pages", pages);
    }
  }, [pages]);*/

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
            <MiniSearchProvider>
              <PageStatusProvider>
                <EditingArea userId={session.id} pages={pages} />
              </PageStatusProvider>
            </MiniSearchProvider>
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