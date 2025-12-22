import React from 'react'
import BlogDetailPage from '../../../components/features/BlogDetailPage'

const BlogDetailRoute = async ({ params }) => {
    const { id } = await params
    return <BlogDetailPage blogId={id} />
}

export default BlogDetailRoute
