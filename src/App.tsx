import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  Outlet,
} from "react-router-dom";
import { useAuth } from "./hooks/useAuth";
import LoginPage from "./pages/LoginPage";
import SurveyPage from "./pages/SurveyPage";
import HomePage from "./pages/HomePage";
import ProfilePage from "./pages/ProfilePage";
import CreatePost from "./pages/CreatePost";
import PostPage from "./pages/PostPage";
import EditPostPage from "./pages/EditPostPage";
import RootLayout from "./components/layout/RootLayout";

function App() {
  const { user, loading, isNewUser } = useAuth();

  const ProtectedLayout = () => {
    if (loading) return <div>Loading...</div>;
    if (!user) return <Navigate to="/login" />;
    if (isNewUser) return <Navigate to="/survey" />;
    return <RootLayout />;
  };

  const AuthLayout = () => {
    if (loading) return <div>Loading...</div>;
    if (user && !isNewUser) return <Navigate to="/" />;
    if (user && isNewUser) return <Navigate to="/survey" />;
    return <Outlet />;
  };

  return (
    <Router>
      <Routes>
        <Route element={<ProtectedLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/post/:id" element={<PostPage />} />
          <Route path="/create-post" element={<CreatePost />} />
          <Route path="/edit-post/:id" element={<EditPostPage />} />
        </Route>
        
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<LoginPage />} />
        </Route>

        <Route path="/survey" element={<SurveyPage />} />
      </Routes>
    </Router>
  );
}

export default App;
