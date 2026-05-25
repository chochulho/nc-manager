'use client'

/**
 * Quality Hub SSO 랜딩 페이지
 *
 * quality-hub → NC Manager 이동 시 Supabase 매직 링크가
 * 이 URL로 리다이렉트됩니다:
 *   https://nc-manager-chi.vercel.app/ko/sso#access_token=...&refresh_token=...
 *
 * @supabase/ssr의 브라우저 클라이언트는 해시를 자동 파싱하지 않으므로
 * 직접 파싱 후 setSession()을 호출합니다.
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

    async function handleSso() {
      try {
        // URL 해시에서 토큰 직접 파싱
        const hash = window.location.hash.substring(1) // '#' 제거
        const params = new URLSearchParams(hash)
        const accessToken = params.get('access_token')
        const refreshToken = params.get('refresh_token')

        if (accessToken && refreshToken) {
          // 해시 토큰으로 세션 설정
          const { data: { session }, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          })

          if (error) {
            console.error('[SSO] setSession 오류:', error.message)
            setStatus('error')
            return
          }

          if (session) {
            // 해시 제거 후 대시보드 이동
            router.replace(`/${locale}`)
            return
          }
        }

        // 해시 토큰 없으면 기존 세션 확인
        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          router.replace(`/${locale}`)
        } else {
          setStatus('error')
        }
      } catch (err) {
        console.error('[SSO] 오류:', err)
        setStatus('error')
      }
    }

    handleSso()
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
