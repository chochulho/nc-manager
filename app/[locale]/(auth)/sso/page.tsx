'use client'

/**
 * Quality Hub SSO 랜딩 페이지
 *
 * quality-hub → NC Manager 이동 시 Supabase 매직 링크가
 * 이 URL로 리다이렉트됩니다:
 *   https://nc-manager-chi.vercel.app/ko/sso#access_token=...
 *
 * 브라우저 Supabase 클라이언트가 URL 해시를 감지해 자동으로
 * 세션 쿠키를 설정하고, 대시보드로 이동합니다.
 */

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'

export default function SsoPage() {
  const router = useRouter()
  const params = useParams()
  const locale = (params?.locale as string) ?? 'ko'
  const [status, setStatus] = useState<'processing' | 'error'>('processing')

  useEffect(() => {
    const supabase = createSupabaseBrowserClient()

    // onAuthStateChange가 URL 해시의 access_token을 자동 감지함
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'SIGNED_IN' && session) {
          router.replace(`/${locale}`)
        } else if (event === 'TOKEN_REFRESHED') {
          router.replace(`/${locale}`)
        }
      }
    )

    // 이미 세션이 있으면 바로 이동
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        router.replace(`/${locale}`)
      }
    })

    // 5초 후에도 처리 안 되면 에러 표시
    const timer = setTimeout(() => setStatus('error'), 5000)

    return () => {
      subscription.unsubscribe()
      clearTimeout(timer)
    }
  }, [router, locale])

  if (status === 'error') {
    return (
      <div className="flex flex-col items-center gap-4 text-center py-8">
        <p className="text-destructive font-medium">로그인에 실패했습니다.</p>
        <a
          href={`/${locale}/login`}
          className="text-sm underline text-muted-foreground hover:text-foreground"
        >
          직접 로그인하기
        </a>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-3 py-8">
      <div className="h-8 w-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
      <p className="text-sm text-muted-foreground">
        Quality Hub에서 로그인 정보를 가져오는 중…
      </p>
    </div>
  )
}
