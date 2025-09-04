import { useDeleteAppMutation } from "@/mutations/apps";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import { Loader2Icon } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "./ui/drawer";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { AppSchemaType } from "@/api/schemas/apps";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "./ui/form";
import { Input } from "./ui/input";

export function AppDetailsDeleteButton({ app }: { app: AppSchemaType }) {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();
  const deleteAppMutation = useDeleteAppMutation({
    appId: app.id,
    onSuccess() {
      toast.success("App deleted successfully");
      setIsOpen(false);

      router.replace("/apps");
    },
    onError(error) {
      console.error(error);
      toast.error("Failed to delete app");
    },
  });
  const isMobile = useIsMobile();
  const form = useForm({
    resolver: zodResolver(
      z.object({
        name: z.literal(app.name, {
          errorMap(issue, ctx) {
            if (issue.code === "invalid_literal") {
              return {
                message: "The name is incorrect",
              };
            }

            return {
              message: ctx.defaultError,
            };
          },
        }),
      }),
    ),
    defaultValues: {
      name: "",
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
            id="delete-app-form"
            onSubmit={form.handleSubmit(() => {
              deleteAppMutation.mutate();
            })}
          >
            <DrawerTrigger asChild>
              <Button variant="destructive">Delete App</Button>
            </DrawerTrigger>
            <DrawerContent>
              <DrawerHeader>
                <DrawerTitle>Delete App</DrawerTitle>
                <DrawerDescription>
                  Are you sure you want to delete this app?
                </DrawerDescription>
              </DrawerHeader>
              <div className="flex flex-col gap-4 p-4 text-sm">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>App Name</FormLabel>
                      <FormControl>
                        <Input {...field} required />
                      </FormControl>
                      <FormDescription>
                        Please enter the name <strong>{app.name}</strong> of the
                        app to delete.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                ></FormField>
              </div>
              <DrawerFooter>
                <Button
                  variant="destructive"
                  type="submit"
                  form="delete-app-form"
                >
                  {deleteAppMutation.isPending ? (
                    <Loader2Icon className="h-4 w-4 animate-spin" />
                  ) : (
                    "Delete"
                  )}
                </Button>
                <Button variant="outline" onClick={() => setIsOpen(false)}>
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
        if (deleteAppMutation.isPending) {
          return;
        }

        setIsOpen(open);
      }}
    >
      <Form {...form}>
        <form
          id="delete-app-dialog-form"
          onSubmit={form.handleSubmit(() => {
            deleteAppMutation.mutate();
          })}
        >
          <DialogTrigger asChild>
            <Button variant="destructive">Delete App</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete App</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete this app?
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>App Name</FormLabel>
                    <FormControl>
                      <Input {...field} required />
                    </FormControl>
                    <FormDescription>
                      Please enter the name <strong>{app.name}</strong> of the
                      app to delete.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <DialogFooter>
              <Button
                disabled={deleteAppMutation.isPending}
                variant="outline"
                onClick={() => setIsOpen(false)}
              >
                Cancel
              </Button>
              <Button
                disabled={deleteAppMutation.isPending}
                variant="destructive"
                type="submit"
                form="delete-app-dialog-form"
              >
                {deleteAppMutation.isPending ? (
                  <Loader2Icon className="h-4 w-4 animate-spin" />
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
