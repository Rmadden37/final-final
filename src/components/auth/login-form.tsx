"use client";

import {zodResolver} from "@hookform/resolvers/zod";
import {signInWithEmailAndPassword} from "firebase/auth";
import {useForm} from "react-hook-form";
import * as z from "zod";
import {auth} from "@/lib/firebase";
import {Button} from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {Input} from "@/components/ui/input";
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card";
import {useToast} from "@/hooks/use-toast";
import {useState} from "react";
import {Loader2} from "lucide-react";
import {FirebaseError} from "firebase/app";

const formSchema = z.object({
  email: z.string().email({message: "Invalid email address."}),
  password: z.string().min(6, {message: "Password must be at least 6 characters."}),
});

export default function LoginForm() {
  const {toast} = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    // Prevent multiple submissions
    if (isLoading) return;
    
    setIsLoading(true);
    
    try {
      console.log('🔐 Attempting login for:', values.email);
      
      const userCredential = await signInWithEmailAndPassword(
        auth, 
        values.email, 
        values.password
      );
      
      console.log('✅ Login successful:', userCredential.user.uid);
      
      toast({
        title: "Login Successful",
        description: "Welcome back!",
      });
      
      // Navigation is handled by the AuthProvider
      // No need to manually redirect here
      
    } catch (error) {
      console.error('❌ Login error:', error);
      
      let errorMessage = "An unexpected error occurred.";
      
      if (error instanceof FirebaseError) {
        switch (error.code) {
          case 'auth/user-not-found':
            errorMessage = "No account found with this email address.";
            break;
          case 'auth/wrong-password':
            errorMessage = "Incorrect password.";
            break;
          case 'auth/invalid-email':
            errorMessage = "Invalid email address.";
            break;
          case 'auth/user-disabled':
            errorMessage = "This account has been disabled.";
            break;
          case 'auth/too-many-requests':
            errorMessage = "Too many failed attempts. Please try again later.";
            break;
          case 'auth/network-request-failed':
            errorMessage = "Network error. Please check your connection.";
            break;
          default:
            errorMessage = error.message;
        }
      }
      
      toast({
        title: "Login Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      // Ensure loading state is cleared
      setIsLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-md shadow-xl">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-headline">Welcome back</CardTitle>
        <CardDescription>
          Enter your credentials to access your LeadFlow dashboard
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({field}) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="you@example.com" 
                      type="email"
                      autoComplete="email"
                      disabled={isLoading}
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({field}) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input 
                      type="password" 
                      placeholder="••••••••" 
                      autoComplete="current-password"
                      disabled={isLoading}
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button 
              type="submit" 
              className="w-full" 
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign in"
              )}
            </Button>
          </form>
        </Form>
        
        {/* Optional: Add forgot password link */}
        <div className="mt-4 text-center">
          <a 
            href="#" 
            className="text-sm text-muted-foreground hover:text-primary"
            onClick={(e) => {
              e.preventDefault();
              toast({
                title: "Coming soon",
                description: "Password reset functionality will be available soon.",
              });
            }}
          >
            Forgot your password?
          </a>
        </div>
      </CardContent>
    </Card>
  );
}