import { NextRequest, NextResponse } from 'next/server'

// 구글 캘린더에 일정 추가
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { summary, start, end, workspaceId, googleToken } = body

    // 요청 본문에서 Google 토큰 가져오기
    const accessToken = googleToken
    
    if (!accessToken) {
      return NextResponse.json(
        { error: 'No Google access token available. Please sign in with Google and grant calendar permissions.', needsReauth: true },
        { status: 401 }
      )
    }

    // 구글 캘린더 API를 통해 일정 추가
    const calendarResponse = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        summary: summary,
        start: {
          dateTime: start,
          timeZone: 'Asia/Seoul',
        },
        end: {
          dateTime: end,
          timeZone: 'Asia/Seoul',
        },
      }),
    })

    if (!calendarResponse.ok) {
      const errorData = await calendarResponse.text()
      console.error('Google Calendar API error:', errorData)
      
      // 401 Unauthorized: 토큰 만료 또는 권한 없음
      if (calendarResponse.status === 401) {
        return NextResponse.json(
          { 
            error: 'Google authentication expired or invalid. Please sign in again.', 
            details: errorData,
            needsReauth: true 
          },
          { status: 401 }
        )
      }
      
      return NextResponse.json(
        { error: 'Failed to create calendar event', details: errorData },
        { status: calendarResponse.status }
      )
    }

    const eventData = await calendarResponse.json()

    return NextResponse.json({
      success: true,
      event: {
        id: eventData.id,
        summary: eventData.summary,
        start: eventData.start?.dateTime,
        end: eventData.end?.dateTime,
      },
    })
  } catch (error) {
    console.error('Calendar API Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// 구글 캘린더에서 일정 삭제
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json()
    const { eventId, googleToken } = body

    const accessToken = googleToken
    
    if (!accessToken || !eventId) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      )
    }

    // 구글 캘린더 API를 통해 일정 삭제
    const calendarResponse = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    )

    if (!calendarResponse.ok) {
      const errorData = await calendarResponse.text()
      console.error('Google Calendar API error:', errorData)
      
      // 401 Unauthorized: 토큰 만료 또는 권한 없음
      if (calendarResponse.status === 401) {
        return NextResponse.json(
          { 
            error: 'Google authentication expired or invalid. Please sign in again.', 
            details: errorData,
            needsReauth: true 
          },
          { status: 401 }
        )
      }
      
      return NextResponse.json(
        { error: 'Failed to delete calendar event', details: errorData },
        { status: calendarResponse.status }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Calendar API Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

