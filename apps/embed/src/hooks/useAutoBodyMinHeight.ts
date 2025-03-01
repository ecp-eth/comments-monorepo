"use client";

import { useChainModal, useConnectModal, useAccountModal } from "@rainbow-me/rainbowkit";
import { useEffect, useState } from "react";

export function useAutoBodyMinHeight() {
  const { connectModalOpen } = useConnectModal();
  const { accountModalOpen } = useAccountModal();
  const { chainModalOpen } = useChainModal();
  const [hasMinHeight, setHasMinHeight] = useState(false);

  useEffect(() => {
    setHasMinHeight(connectModalOpen || accountModalOpen || chainModalOpen)
  }, [connectModalOpen, accountModalOpen, chainModalOpen]);

  useEffect(() => {
    if (!hasMinHeight) {
      return;
    }

    const body = document.body
    const currentMinHeight = parseFloat(getComputedStyle(document.body).minHeight)

    if (currentMinHeight >= 570) {
      return
    }

    const originalMinHeight = body.style.minHeight

    body.style.minHeight = '570px'

    return () => {
      body.style.minHeight = originalMinHeight
    }
  }, [hasMinHeight])
}