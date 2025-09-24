"use client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import { Loader2Icon } from "lucide-react";
import { useEffect } from "react";
import { toast } from "sonner";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "../ui/drawer";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "../ui/form";
import { Input } from "../ui/input";
import { useDeleteMyAccountMutation } from "@/mutations/user";
import { useAuth } from "@/components/auth-provider";

interface DeleteAccountDialogProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

export function DeleteAccountDialog({
  isOpen,
  setIsOpen,
}: DeleteAccountDialogProps) {
  const user = useAuth();
  const deleteMyAccountMutation = useDeleteMyAccountMutation({
    onSuccess() {
      toast.success("Account deleted successfully");
      setIsOpen(false);

      if (user.isLoggedIn) {
        user.logout();
      }
    },
    onError(error) {
      console.error(error);
      toast.error("Failed to delete account");
    },
  });
  const isMobile = useIsMobile();
  const form = useForm({
    resolver: zodResolver(
      z.object({
        answer: z.string().refine((value) => value === "yes", {
          message: "The answer is incorrect",
        }),
      }),
    ),
    defaultValues: {
      answer: "",
    },
  });

  useEffect(() => {
    if (!isOpen) {
      form.reset();
    }
  }, [isOpen, form]);

  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={setIsOpen}>
        <Form {...form}>
          <form
            id="delete-account-form"
            onSubmit={form.handleSubmit(() => {
              deleteMyAccountMutation.mutate();
            })}
          >
            <DrawerContent>
              <DrawerHeader>
                <DrawerTitle>Delete Account</DrawerTitle>
                <DrawerDescription>
                  Are you sure you want to delete your account?
                </DrawerDescription>
              </DrawerHeader>
              <div className="flex flex-col gap-4 p-4 text-sm">
                <FormField
                  control={form.control}
                  name="answer"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel hidden>Answer</FormLabel>
                      <FormControl>
                        <Input {...field} required />
                      </FormControl>
                      <FormDescription>
                        Please type <strong>yes</strong> to delete your account.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                ></FormField>
              </div>
              <DrawerFooter>
                <Button
                  className="gap-2"
                  disabled={deleteMyAccountMutation.isPending}
                  variant="destructive"
                  type="submit"
                  form="delete-account-form"
                >
                  {deleteMyAccountMutation.isPending ? (
                    <>
                      <Loader2Icon className="h-4 w-4 animate-spin" />
                      <span>Deleting...</span>
                    </>
                  ) : (
                    "Delete"
                  )}
                </Button>
                <Button
                  disabled={deleteMyAccountMutation.isPending}
                  variant="outline"
                  onClick={() => setIsOpen(false)}
                  type="button"
                >
                  Cancel
                </Button>
              </DrawerFooter>
            </DrawerContent>
          </form>
        </Form>
      </Drawer>
    );
  }

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (deleteMyAccountMutation.isPending) {
          return;
        }

        setIsOpen(open);
      }}
    >
      <Form {...form}>
        <form
          id="delete-account-dialog-form"
          onSubmit={form.handleSubmit(() => {
            deleteMyAccountMutation.mutate();
          })}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Account</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete your account?
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-4">
              <FormField
                control={form.control}
                name="answer"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel hidden>Answer</FormLabel>
                    <FormControl>
                      <Input {...field} required />
                    </FormControl>
                    <FormDescription>
                      Please type <strong>yes</strong> to delete your account.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <DialogFooter>
              <Button
                disabled={deleteMyAccountMutation.isPending}
                variant="outline"
                onClick={() => setIsOpen(false)}
                type="button"
              >
                Cancel
              </Button>
              <Button
                className="gap-2"
                disabled={deleteMyAccountMutation.isPending}
                variant="destructive"
                type="submit"
                form="delete-account-dialog-form"
              >
                {deleteMyAccountMutation.isPending ? (
                  <>
                    <Loader2Icon className="h-4 w-4 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  "Delete"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </form>
      </Form>
    </Dialog>
  );
}
