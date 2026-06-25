import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Header from "./components/Header";

import CreatePost from "./pages/CreatePost";
import AddReply from "./pages/AddReply";
import EditPost from "./pages/EditPost";
import PostPage from "./pages/PostPage";
import AdminLogin from "./pages/AdminLogin";
import ProtectedRoute from "./components/ProtectedRoute";

import Events from "./pages/Events";
import EventDetail from "./pages/EventDetail";
import CreateEvent from "./pages/CreateEvent";
import EditEvent from "./pages/EditEvent";

import Projects from "./pages/Projects";
import ProjectDetail from "./pages/ProjectDetail";
import CreateProject from "./pages/CreateProject";
import EditProject from "./pages/EditProject";
import Archive from "./pages/Archive";
import ManageDisplay from "./pages/ManageDisplay";
import ManageAuthors from "./pages/ManageAuthors";
import Topics from "./pages/Topics";
import TopicDetail from "./pages/TopicDetail";
import TopicForm from "./pages/TopicForm";

import "./App.css";

function App() {
    return (
        <BrowserRouter>
            <Header />
            <Routes>
                {/* PUBLIC ROUTES */}
                <Route path="/" element={<Home />} />
                <Route path="/archive" element={<Archive />} />
                <Route path="/post/:postId" element={<PostPage />} />
                <Route path="/events" element={<Events />} />
                <Route path="/events/:eventId" element={<EventDetail />} />
                <Route path="/projects" element={<Projects />} />
                <Route path="/projects/:projectId" element={<ProjectDetail />} />
                <Route path="/specials" element={<Topics />} />
                <Route path="/specials/:topicId" element={<TopicDetail />} />

                {/* ADMIN LOGIN */}
                <Route path="/admin" element={<AdminLogin />} />

                {/* PROTECTED ROUTES */}
                <Route
                    path="/manage-display"
                    element={
                        <ProtectedRoute>
                            <ManageDisplay />
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/manage-authors"
                    element={
                        <ProtectedRoute>
                            <ManageAuthors />
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/create-special"
                    element={
                        <ProtectedRoute>
                            <TopicForm />
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/edit-special/:topicId"
                    element={
                        <ProtectedRoute>
                            <TopicForm />
                        </ProtectedRoute>
                    }
                />

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

                <Route
                    path="/create-project"
                    element={
                        <ProtectedRoute>
                            <CreateProject />
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/edit-project/:projectId"
                    element={
                        <ProtectedRoute>
                            <EditProject />
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/create-event"
                    element={
                        <ProtectedRoute>
                            <CreateEvent />
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/edit-event/:eventId"
                    element={
                        <ProtectedRoute>
                            <EditEvent />
                        </ProtectedRoute>
                    }
                />
            </Routes>
        </BrowserRouter>
    );
}

export default App;
