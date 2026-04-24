import LoginForm from '@/components/auth/LoginForm';


export const metadata = {
  title: 'Log in — ClipSync',
  description: 'Sign in to ClipSync to access and manage your saved clipboards.',
};

export default function LoginPage() {
  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center bg-stone-50 dark:bg-stone-900 px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="card">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="flex items-center justify-center gap-2 text-olive-600 dark:text-olive-400 font-semibold text-lg mb-4">
              <span aria-hidden="true" className="w-2 h-2 rounded-sm bg-olive-500 inline-block" />
              ClipSync
            </div>
            <h1 className="text-xl font-semibold text-stone-900 dark:text-stone-50">Welcome back</h1>
            <p className="text-sm text-stone-400 mt-1">Sign in to access your clipboards</p>
          </div>

          <LoginForm />
        </div>
      </div>
    </div>
  );
}
