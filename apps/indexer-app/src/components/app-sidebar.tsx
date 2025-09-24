"use client";
import {
  LayoutDashboardIcon,
  TerminalSquareIcon,
  ChevronUpIcon,
  LogOutIcon,
  User2Icon,
  FileTextIcon,
  UserRoundXIcon,
} from "lucide-react";
import Link from "next/link";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarGroup,
} from "./ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { useDisconnectWalletAndLogout } from "@/hooks/use-disconnect-wallet-and-logout";
import { Logo } from "./logo";
import { DeleteAccountDialog } from "./app-sidebar/delete-account-dialog";
import { useState } from "react";

export function AppSidebar() {
  const disconnectWalletAndLogout = useDisconnectWalletAndLogout();
  const [isDeleteAccountDialogOpen, setIsDeleteAccountDialogOpen] =
    useState(false);

  return (
    <>
      <Sidebar>
        <SidebarHeader className="flex flex-row items-center gap-2 text-base h-16 px-4">
          <Logo width={24} height={24} />
          <span className="font-semibold">ECP Dashboard</span>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link href="/">
                    <LayoutDashboardIcon /> <span>Dashboard</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link href="/apps">
                    <TerminalSquareIcon /> <span>Apps</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <Link href="/terms">
                  <FileTextIcon /> <span>Terms and conditions</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuButton>
                    <User2Icon /> <span>Account</span>
                    <ChevronUpIcon className="ml-auto" />
                  </SidebarMenuButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  side="top"
                  className="w-[--radix-popper-anchor-width]"
                >
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={() => setIsDeleteAccountDialogOpen(true)}
                  >
                    <UserRoundXIcon /> <span>Delete Account</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={disconnectWalletAndLogout}>
                    <LogOutIcon /> <span>Logout</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>
      <DeleteAccountDialog
        isOpen={isDeleteAccountDialogOpen}
        setIsOpen={setIsDeleteAccountDialogOpen}
      />
    </>
  );
}
