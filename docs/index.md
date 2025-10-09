<script setup>
import { onMounted } from 'vue'
import { useRouter } from 'vitepress'

const router = useRouter()

onMounted(() => {
  // Use router.go with full path including base
  if (window.location.pathname.endsWith('/event-flows/') ||
      window.location.pathname === '/event-flows') {
    window.location.href = '/event-flows/introduction'
  }
})
</script>

# Redirecting...

You are being redirected to the [Introduction](./introduction) page.
