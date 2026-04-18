export const ROUTES = {
    home: "/",
    events: "/events",
    admin: "/admin",
    createPost: "/create-post",
    editPost: (id) => `/edit-post/${id}`,
    addReply: (id) => `/add-reply/${id}`,
    createEvent: "/create-event",
    editEvent: (id) => `/edit-event/${id}`,
};
