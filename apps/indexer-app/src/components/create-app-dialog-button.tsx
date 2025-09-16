"use client";
import { PlusIcon } from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { ZodError } from "zod";
import { useForm } from "react-hook-form";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "./ui/form";
import { Input } from "./ui/input";
import {
  AppCreateRequestSchema,
  AppCreateRequestSchemaType,
} from "@/api/schemas/apps";
import { useCreateAppMutation } from "@/mutations/apps";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Drawer,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "./ui/drawer";

type CreateAppDialogButtonProps = {
  className?: string;
  formClassName?: string;
};

export function CreateAppDialogButton({
  className,
  formClassName,
}: CreateAppDialogButtonProps) {
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();
  const form = useForm<AppCreateRequestSchemaType>({
    resolver: zodResolver(AppCreateRequestSchema),
    defaultValues: {
      name: "",
    },
  });

  const createAppMutation = useCreateAppMutation({
    onError(error) {
      if (error instanceof ZodError) {
        error.issues.forEach((issue) => {
          form.setError(
            issue.path.join(".") as keyof AppCreateRequestSchemaType,
            {
              message: issue.message,
            },
          );
        });
      } else {
        console.error(error);
        toast.error("Failed to create app. Please try again.");
      }
    },
    onSuccess(data) {
      form.reset();
      toast.success("App created successfully");
      router.push(`/apps/${data.id}`);

      setIsOpen(false);
    },
  });

  const handleSubmit = form.handleSubmit((values) => {
    try {
      return createAppMutation.mutateAsync(values);
    } catch {
      // we don't care, error is handled in mutation's onError handler
    }
  });

  useEffect(() => {
    if (!isOpen) {
      form.reset();
    }
  }, [isOpen, form]);

  if (isMobile) {
    return (
      <Drawer
        open={isOpen}
        onOpenChange={(open) => {
          setIsOpen(open);
        }}
        direction="bottom"
      >
        <Form {...form}>
          <form
            id="create-app-dialog-form"
            onSubmit={handleSubmit}
            className={formClassName}
          >
            <DrawerTrigger asChild>
              <Button className={className}>
                <PlusIcon /> Create app
              </Button>
            </DrawerTrigger>
            <DrawerContent>
              <DrawerHeader>
                <DrawerTitle>New app</DrawerTitle>
              </DrawerHeader>
              <div className="flex flex-col gap-4 p-4 overflow-y-auto text-sm">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input placeholder="My App" {...field} />
                      </FormControl>
                      <FormDescription>
                        This is your app name. It can&apos;t be longer than 50
                        characters.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <DrawerFooter>
                <Button type="submit" form="create-app-dialog-form">
                  Create
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
        setIsOpen(open);
      }}
    >
      <Form {...form}>
        <form
          id="create-app-dialog-form"
          onSubmit={handleSubmit}
          className={formClassName}
        >
          <DialogTrigger asChild>
            <Button className={className}>
              <PlusIcon /> Create app
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New app</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="My App" {...field} />
                    </FormControl>
                    <FormDescription>
                      This is your app name. It can&apos;t be longer than 50
                      characters.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <DialogFooter>
              <Button type="submit" form="create-app-dialog-form">
                Create
              </Button>
            </DialogFooter>
          </DialogContent>
        </form>
      </Form>
    </Dialog>
  );
}
