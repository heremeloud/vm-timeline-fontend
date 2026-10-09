import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Header from "./components/Header";
import ScrollToTopButton from "./components/ScrollToTopButton";
import AdminQuickActions from "./components/AdminQuickActions";
import ProtectedRoute from "./components/ProtectedRoute";

import "./App.css";

const AddReply = lazy(() => import("./pages/AddReply"));
const AdminLogin = lazy(() => import("./pages/AdminLogin"));
const Archive = lazy(() => import("./pages/Archive"));
const CreateEvent = lazy(() => import("./pages/CreateEvent"));
const CreatePost = lazy(() => import("./pages/CreatePost"));
const CreateProject = lazy(() => import("./pages/CreateProject"));
const EditEvent = lazy(() => import("./pages/EditEvent"));
const EditPost = lazy(() => import("./pages/EditPost"));
const EditProject = lazy(() => import("./pages/EditProject"));
const EventDetail = lazy(() => import("./pages/EventDetail"));
const Events = lazy(() => import("./pages/Events"));
const ManageAuthors = lazy(() => import("./pages/ManageAuthors"));
const ManageDisplay = lazy(() => import("./pages/ManageDisplay"));
const PostPage = lazy(() => import("./pages/PostPage"));
const ProjectDetail = lazy(() => import("./pages/ProjectDetail"));
const ProjectRelatedPosts = lazy(() => import("./pages/ProjectRelatedPosts"));
const Projects = lazy(() => import("./pages/Projects"));
const TopicDetail = lazy(() => import("./pages/TopicDetail"));
const TopicForm = lazy(() => import("./pages/TopicForm"));
const Topics = lazy(() => import("./pages/Topics"));

function App() {
    return (
        <BrowserRouter>
            <Header />
            <Suspense fallback={<div role="status">Loading…</div>}>
                <Routes>
                    {/* PUBLIC ROUTES */}
                    <Route path="/" element={<Home />} />
                <Route path="/archive" element={<Archive />} />
                <Route path="/post/:postId" element={<PostPage />} />
                <Route path="/events" element={<Events />} />
                <Route path="/events/view/:eventViewSlug" element={<Events />} />
                <Route path="/events/:eventId" element={<EventDetail />} />
                <Route path="/projects" element={<Projects />} />
                <Route path="/projects/:projectId" element={<ProjectDetail />} />
                <Route path="/projects/:projectId/:entryType/:entryNumber" element={<ProjectRelatedPosts />} />
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
            </Suspense>
            <AdminQuickActions />
            <ScrollToTopButton />
        </BrowserRouter>
    );
}

export default App;
