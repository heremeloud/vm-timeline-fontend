import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import CreatePost from "./pages/CreatePost";
import AddReply from "./pages/AddReply";
import EditPost from "./pages/EditPost";
import PostPage from "./pages/PostPage";
import AdminLogin from "./pages/AdminLogin";
import ProtectedRoute from "./components/ProtectedRoute";
import "./App.css";

function App() {
    return (
        <BrowserRouter>
            <Routes>
                {/* PUBLIC ROUTES */}
                <Route path="/" element={<Home />} />
                <Route path="/post/:postId" element={<PostPage />} />

                {/* ADMIN LOGIN */}
                <Route path="/admin" element={<AdminLogin />} />

                {/* PROTECTED ROUTES */}
                <Route
                    path="/create-post"
                    element={
                        <ProtectedRoute>
                            <CreatePost />
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/add-reply/:postId"
                    element={
                        <ProtectedRoute>
                            <AddReply />
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/edit-post/:postId"
                    element={
                        <ProtectedRoute>
                            <EditPost />
                        </ProtectedRoute>
                    }
                />
            </Routes>
        </BrowserRouter>
    );
}

export default App;
