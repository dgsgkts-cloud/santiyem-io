export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      attendance_records: {
        Row: {
          created_at: string
          id: string
          note: string | null
          personnel_id: string
          project_id: string
          qr_attendance_id: string | null
          source: Database["public"]["Enums"]["attendance_source"]
          status: Database["public"]["Enums"]["attendance_status"]
          updated_at: string
          user_id: string
          work_date: string
        }
        Insert: {
          created_at?: string
          id?: string
          note?: string | null
          personnel_id: string
          project_id: string
          qr_attendance_id?: string | null
          source?: Database["public"]["Enums"]["attendance_source"]
          status?: Database["public"]["Enums"]["attendance_status"]
          updated_at?: string
          user_id: string
          work_date: string
        }
        Update: {
          created_at?: string
          id?: string
          note?: string | null
          personnel_id?: string
          project_id?: string
          qr_attendance_id?: string | null
          source?: Database["public"]["Enums"]["attendance_source"]
          status?: Database["public"]["Enums"]["attendance_status"]
          updated_at?: string
          user_id?: string
          work_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_records_personnel_id_fkey"
            columns: ["personnel_id"]
            isOneToOne: false
            referencedRelation: "personnel"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_records_qr_attendance_id_fkey"
            columns: ["qr_attendance_id"]
            isOneToOne: false
            referencedRelation: "unmatched_qr_checkins"
            referencedColumns: ["worker_attendance_id"]
          },
          {
            foreignKeyName: "attendance_records_qr_attendance_id_fkey"
            columns: ["qr_attendance_id"]
            isOneToOne: false
            referencedRelation: "worker_attendance"
            referencedColumns: ["id"]
          },
        ]
      }
      cash_accounts: {
        Row: {
          account_no: string | null
          account_type: string
          balance: number
          bank_name: string | null
          branch: string | null
          created_at: string
          iban: string | null
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          account_no?: string | null
          account_type?: string
          balance?: number
          bank_name?: string | null
          branch?: string | null
          created_at?: string
          iban?: string | null
          id?: string
          name?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          account_no?: string | null
          account_type?: string
          balance?: number
          bank_name?: string | null
          branch?: string | null
          created_at?: string
          iban?: string | null
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      cash_checks: {
        Row: {
          account_no: string | null
          amount: number
          bank_name: string
          branch: string | null
          check_no: string
          check_type: string
          counterparty: string
          created_at: string
          due_date: string
          id: string
          image_url: string | null
          project_id: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          account_no?: string | null
          amount?: number
          bank_name?: string
          branch?: string | null
          check_no?: string
          check_type?: string
          counterparty?: string
          created_at?: string
          due_date: string
          id?: string
          image_url?: string | null
          project_id?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          account_no?: string | null
          amount?: number
          bank_name?: string
          branch?: string | null
          check_no?: string
          check_type?: string
          counterparty?: string
          created_at?: string
          due_date?: string
          id?: string
          image_url?: string | null
          project_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      cash_collections: {
        Row: {
          account_id: string | null
          amount: number
          check_bank: string | null
          check_due_date: string | null
          check_no: string | null
          collection_date: string
          collection_type: string
          created_at: string
          description: string | null
          hakedis_id: string | null
          id: string
          payment_type: string
          project_id: string | null
          receipt_url: string | null
          sender: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          account_id?: string | null
          amount?: number
          check_bank?: string | null
          check_due_date?: string | null
          check_no?: string | null
          collection_date?: string
          collection_type?: string
          created_at?: string
          description?: string | null
          hakedis_id?: string | null
          id?: string
          payment_type?: string
          project_id?: string | null
          receipt_url?: string | null
          sender?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          account_id?: string | null
          amount?: number
          check_bank?: string | null
          check_due_date?: string | null
          check_no?: string | null
          collection_date?: string
          collection_type?: string
          created_at?: string
          description?: string | null
          hakedis_id?: string | null
          id?: string
          payment_type?: string
          project_id?: string | null
          receipt_url?: string | null
          sender?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cash_collections_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "cash_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      cash_payments: {
        Row: {
          account_id: string | null
          amount: number
          bank_name: string | null
          category: string
          check_bank: string | null
          check_due_date: string | null
          check_no: string | null
          check_reminder_sent_at: string | null
          created_at: string
          description: string | null
          iban: string | null
          id: string
          invoice_url: string | null
          is_recurring: boolean
          overdue_reminder_sent_at: string | null
          payment_date: string
          payment_type: string
          project_id: string | null
          recipient: string
          recurring_interval: string | null
          source_id: string | null
          source_type: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          account_id?: string | null
          amount?: number
          bank_name?: string | null
          category?: string
          check_bank?: string | null
          check_due_date?: string | null
          check_no?: string | null
          check_reminder_sent_at?: string | null
          created_at?: string
          description?: string | null
          iban?: string | null
          id?: string
          invoice_url?: string | null
          is_recurring?: boolean
          overdue_reminder_sent_at?: string | null
          payment_date?: string
          payment_type?: string
          project_id?: string | null
          recipient?: string
          recurring_interval?: string | null
          source_id?: string | null
          source_type?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          account_id?: string | null
          amount?: number
          bank_name?: string | null
          category?: string
          check_bank?: string | null
          check_due_date?: string | null
          check_no?: string | null
          check_reminder_sent_at?: string | null
          created_at?: string
          description?: string | null
          iban?: string | null
          id?: string
          invoice_url?: string | null
          is_recurring?: boolean
          overdue_reminder_sent_at?: string | null
          payment_date?: string
          payment_type?: string
          project_id?: string | null
          recipient?: string
          recurring_interval?: string | null
          source_id?: string | null
          source_type?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cash_payments_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "cash_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          attachments: Json | null
          content: string
          conversation_id: string
          created_at: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          attachments?: Json | null
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          role: string
          user_id: string
        }
        Update: {
          attachments?: Json | null
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      communication_delivery_attempts: {
        Row: {
          attempt_number: number | null
          attempted_at: string
          channel: Database["public"]["Enums"]["comm_channel"] | null
          completed_at: string | null
          error: string | null
          error_code: string | null
          id: string
          message_id: string
          next_retry_at: string | null
          provider: string | null
          provider_message_id: string | null
          response: Json | null
          retryable: boolean | null
          started_at: string | null
          status: Database["public"]["Enums"]["comm_status"]
        }
        Insert: {
          attempt_number?: number | null
          attempted_at?: string
          channel?: Database["public"]["Enums"]["comm_channel"] | null
          completed_at?: string | null
          error?: string | null
          error_code?: string | null
          id?: string
          message_id: string
          next_retry_at?: string | null
          provider?: string | null
          provider_message_id?: string | null
          response?: Json | null
          retryable?: boolean | null
          started_at?: string | null
          status: Database["public"]["Enums"]["comm_status"]
        }
        Update: {
          attempt_number?: number | null
          attempted_at?: string
          channel?: Database["public"]["Enums"]["comm_channel"] | null
          completed_at?: string | null
          error?: string | null
          error_code?: string | null
          id?: string
          message_id?: string
          next_retry_at?: string | null
          provider?: string | null
          provider_message_id?: string | null
          response?: Json | null
          retryable?: boolean | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["comm_status"]
        }
        Relationships: [
          {
            foreignKeyName: "communication_delivery_attempts_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "communication_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      communication_messages: {
        Row: {
          attachments: Json
          bcc: Json
          body: string
          cc: Json
          channel: Database["public"]["Enums"]["comm_channel"]
          created_at: string
          created_from: string | null
          delivered_at: string | null
          email_account_id: string | null
          error: string | null
          error_code: string | null
          failed_at: string | null
          id: string
          max_retries: number
          media_caption: string | null
          media_url: string | null
          message_type: string
          metadata: Json
          next_retry_at: string | null
          opened_at: string | null
          priority: Database["public"]["Enums"]["comm_priority"]
          processing_started_at: string | null
          project_id: string | null
          provider: string | null
          provider_message_id: string | null
          read_at: string | null
          recipient: string
          recipient_name: string | null
          related_action: string | null
          retry_count: number
          scheduled_at: string | null
          sent_at: string | null
          status: Database["public"]["Enums"]["comm_status"]
          subject: string | null
          template_language: string | null
          template_name: string | null
          template_variables: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          attachments?: Json
          bcc?: Json
          body: string
          cc?: Json
          channel: Database["public"]["Enums"]["comm_channel"]
          created_at?: string
          created_from?: string | null
          delivered_at?: string | null
          email_account_id?: string | null
          error?: string | null
          error_code?: string | null
          failed_at?: string | null
          id?: string
          max_retries?: number
          media_caption?: string | null
          media_url?: string | null
          message_type?: string
          metadata?: Json
          next_retry_at?: string | null
          opened_at?: string | null
          priority?: Database["public"]["Enums"]["comm_priority"]
          processing_started_at?: string | null
          project_id?: string | null
          provider?: string | null
          provider_message_id?: string | null
          read_at?: string | null
          recipient: string
          recipient_name?: string | null
          related_action?: string | null
          retry_count?: number
          scheduled_at?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["comm_status"]
          subject?: string | null
          template_language?: string | null
          template_name?: string | null
          template_variables?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          attachments?: Json
          bcc?: Json
          body?: string
          cc?: Json
          channel?: Database["public"]["Enums"]["comm_channel"]
          created_at?: string
          created_from?: string | null
          delivered_at?: string | null
          email_account_id?: string | null
          error?: string | null
          error_code?: string | null
          failed_at?: string | null
          id?: string
          max_retries?: number
          media_caption?: string | null
          media_url?: string | null
          message_type?: string
          metadata?: Json
          next_retry_at?: string | null
          opened_at?: string | null
          priority?: Database["public"]["Enums"]["comm_priority"]
          processing_started_at?: string | null
          project_id?: string | null
          provider?: string | null
          provider_message_id?: string | null
          read_at?: string | null
          recipient?: string
          recipient_name?: string | null
          related_action?: string | null
          retry_count?: number
          scheduled_at?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["comm_status"]
          subject?: string | null
          template_language?: string | null
          template_name?: string | null
          template_variables?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "communication_messages_email_account_id_fkey"
            columns: ["email_account_id"]
            isOneToOne: false
            referencedRelation: "email_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      company_health_access_log: {
        Row: {
          action: string
          created_at: string
          id: string
          owner_id: string | null
          scope: string | null
          section: string
          team_id: string | null
          user_id: string
        }
        Insert: {
          action?: string
          created_at?: string
          id?: string
          owner_id?: string | null
          scope?: string | null
          section: string
          team_id?: string | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          owner_id?: string | null
          scope?: string | null
          section?: string
          team_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      company_memories: {
        Row: {
          category: string | null
          confidence: number
          content: string
          created_at: string
          created_from: string
          embedding: string | null
          id: string
          last_used_at: string | null
          metadata: Json
          pinned: boolean
          source: string
          team_id: string | null
          title: string | null
          type: Database["public"]["Enums"]["memory_type"]
          updated_at: string
          usage_count: number
          user_confirmed: boolean
          user_id: string
        }
        Insert: {
          category?: string | null
          confidence?: number
          content: string
          created_at?: string
          created_from?: string
          embedding?: string | null
          id?: string
          last_used_at?: string | null
          metadata?: Json
          pinned?: boolean
          source?: string
          team_id?: string | null
          title?: string | null
          type?: Database["public"]["Enums"]["memory_type"]
          updated_at?: string
          usage_count?: number
          user_confirmed?: boolean
          user_id: string
        }
        Update: {
          category?: string | null
          confidence?: number
          content?: string
          created_at?: string
          created_from?: string
          embedding?: string | null
          id?: string
          last_used_at?: string | null
          metadata?: Json
          pinned?: boolean
          source?: string
          team_id?: string | null
          title?: string | null
          type?: Database["public"]["Enums"]["memory_type"]
          updated_at?: string
          usage_count?: number
          user_confirmed?: boolean
          user_id?: string
        }
        Relationships: []
      }
      contract_activity_log: {
        Row: {
          action: string
          actor_email: string | null
          actor_name: string | null
          contract_id: string
          created_at: string
          description: string
          id: string
          metadata: Json | null
        }
        Insert: {
          action: string
          actor_email?: string | null
          actor_name?: string | null
          contract_id: string
          created_at?: string
          description?: string
          id?: string
          metadata?: Json | null
        }
        Update: {
          action?: string
          actor_email?: string | null
          actor_name?: string | null
          contract_id?: string
          created_at?: string
          description?: string
          id?: string
          metadata?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "contract_activity_log_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_items: {
        Row: {
          contract_id: string
          created_at: string
          description: string
          id: string
          poz_no: string
          quantity: number
          sort_order: number
          total_price: number
          unit: string
          unit_price: number
          updated_at: string
          user_id: string
        }
        Insert: {
          contract_id: string
          created_at?: string
          description?: string
          id?: string
          poz_no?: string
          quantity?: number
          sort_order?: number
          total_price?: number
          unit?: string
          unit_price?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          contract_id?: string
          created_at?: string
          description?: string
          id?: string
          poz_no?: string
          quantity?: number
          sort_order?: number
          total_price?: number
          unit?: string
          unit_price?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contract_items_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_signature_requests: {
        Row: {
          cc_emails: string[] | null
          contract_id: string
          created_at: string
          deadline: string | null
          id: string
          message: string
          recipient_email: string
          recipient_name: string
          sent_at: string
          signed_at: string | null
          status: string
          token: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cc_emails?: string[] | null
          contract_id: string
          created_at?: string
          deadline?: string | null
          id?: string
          message?: string
          recipient_email: string
          recipient_name: string
          sent_at?: string
          signed_at?: string | null
          status?: string
          token?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cc_emails?: string[] | null
          contract_id?: string
          created_at?: string
          deadline?: string | null
          id?: string
          message?: string
          recipient_email?: string
          recipient_name?: string
          sent_at?: string
          signed_at?: string | null
          status?: string
          token?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contract_signature_requests_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_signed_uploads: {
        Row: {
          created_at: string
          file_name: string
          file_size: number | null
          file_url: string
          id: string
          ip_address: string | null
          signature_request_id: string
          signer_name: string
          signer_title: string | null
        }
        Insert: {
          created_at?: string
          file_name: string
          file_size?: number | null
          file_url: string
          id?: string
          ip_address?: string | null
          signature_request_id: string
          signer_name: string
          signer_title?: string | null
        }
        Update: {
          created_at?: string
          file_name?: string
          file_size?: number | null
          file_url?: string
          id?: string
          ip_address?: string | null
          signature_request_id?: string
          signer_name?: string
          signer_title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contract_signed_uploads_signature_request_id_fkey"
            columns: ["signature_request_id"]
            isOneToOne: false
            referencedRelation: "contract_signature_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      contracts: {
        Row: {
          ai_analysis: Json | null
          amount: number
          contract_type: string
          counterparty: string
          created_at: string
          end_date: string | null
          file_name: string | null
          file_url: string | null
          id: string
          name: string
          notes: string | null
          payment_schedule: Json | null
          project_id: string | null
          start_date: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_analysis?: Json | null
          amount?: number
          contract_type?: string
          counterparty?: string
          created_at?: string
          end_date?: string | null
          file_name?: string | null
          file_url?: string | null
          id?: string
          name?: string
          notes?: string | null
          payment_schedule?: Json | null
          project_id?: string | null
          start_date?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_analysis?: Json | null
          amount?: number
          contract_type?: string
          counterparty?: string
          created_at?: string
          end_date?: string | null
          file_name?: string | null
          file_url?: string | null
          id?: string
          name?: string
          notes?: string | null
          payment_schedule?: Json | null
          project_id?: string | null
          start_date?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      conversations: {
        Row: {
          created_at: string
          id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      device_push_tokens: {
        Row: {
          created_at: string
          id: string
          last_seen_at: string
          platform: string
          token: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_seen_at?: string
          platform?: string
          token: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          last_seen_at?: string
          platform?: string
          token?: string
          user_id?: string
        }
        Relationships: []
      }
      document_chunks: {
        Row: {
          chunk_index: number
          content: string
          content_hash: string | null
          created_at: string
          document_id: string
          embedding: string | null
          embedding_created_at: string | null
          embedding_model: string | null
          embedding_model_version: string | null
          id: string
          is_global: boolean
          page_number: number
          token_count: number | null
          user_id: string | null
        }
        Insert: {
          chunk_index?: number
          content: string
          content_hash?: string | null
          created_at?: string
          document_id: string
          embedding?: string | null
          embedding_created_at?: string | null
          embedding_model?: string | null
          embedding_model_version?: string | null
          id?: string
          is_global?: boolean
          page_number?: number
          token_count?: number | null
          user_id?: string | null
        }
        Update: {
          chunk_index?: number
          content?: string
          content_hash?: string | null
          created_at?: string
          document_id?: string
          embedding?: string | null
          embedding_created_at?: string | null
          embedding_model?: string | null
          embedding_model_version?: string | null
          id?: string
          is_global?: boolean
          page_number?: number
          token_count?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "document_chunks_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          created_at: string
          doc_date: string | null
          doc_type: string | null
          file_path: string | null
          file_size: number
          id: string
          is_global: boolean
          language: string | null
          last_used_at: string | null
          name: string
          page_count: number
          pinned: boolean
          project_id: string | null
          status: string
          supplier: string | null
          tags: string[]
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          doc_date?: string | null
          doc_type?: string | null
          file_path?: string | null
          file_size?: number
          id?: string
          is_global?: boolean
          language?: string | null
          last_used_at?: string | null
          name: string
          page_count?: number
          pinned?: boolean
          project_id?: string | null
          status?: string
          supplier?: string | null
          tags?: string[]
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          doc_date?: string | null
          doc_type?: string | null
          file_path?: string | null
          file_size?: number
          id?: string
          is_global?: boolean
          language?: string | null
          last_used_at?: string | null
          name?: string
          page_count?: number
          pinned?: boolean
          project_id?: string | null
          status?: string
          supplier?: string | null
          tags?: string[]
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      e_invoices: {
        Row: {
          counterparty_name: string
          counterparty_tax_no: string | null
          created_at: string
          currency: string
          description: string | null
          direction: string
          due_date: string | null
          file_name: string | null
          file_url: string | null
          grand_total: number
          id: string
          invoice_date: string
          invoice_no: string
          invoice_type: string
          invoice_uuid: string | null
          items: Json
          kdv_total: number
          linked_collection_id: string | null
          linked_payment_id: string | null
          notes: string | null
          project_id: string | null
          source: string
          status: string
          subtotal: number
          ubl_payload: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          counterparty_name?: string
          counterparty_tax_no?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          direction: string
          due_date?: string | null
          file_name?: string | null
          file_url?: string | null
          grand_total?: number
          id?: string
          invoice_date?: string
          invoice_no?: string
          invoice_type?: string
          invoice_uuid?: string | null
          items?: Json
          kdv_total?: number
          linked_collection_id?: string | null
          linked_payment_id?: string | null
          notes?: string | null
          project_id?: string | null
          source?: string
          status?: string
          subtotal?: number
          ubl_payload?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          counterparty_name?: string
          counterparty_tax_no?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          direction?: string
          due_date?: string | null
          file_name?: string | null
          file_url?: string | null
          grand_total?: number
          id?: string
          invoice_date?: string
          invoice_no?: string
          invoice_type?: string
          invoice_uuid?: string | null
          items?: Json
          kdv_total?: number
          linked_collection_id?: string | null
          linked_payment_id?: string | null
          notes?: string | null
          project_id?: string | null
          source?: string
          status?: string
          subtotal?: number
          ubl_payload?: Json | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ekb_basvurulari: {
        Row: {
          ad_soyad: string
          bina_tipi: string
          created_at: string
          durum: string
          id: string
          il_ilce: string
          mesaj: string | null
          telefon: string
        }
        Insert: {
          ad_soyad: string
          bina_tipi?: string
          created_at?: string
          durum?: string
          id?: string
          il_ilce: string
          mesaj?: string | null
          telefon: string
        }
        Update: {
          ad_soyad?: string
          bina_tipi?: string
          created_at?: string
          durum?: string
          id?: string
          il_ilce?: string
          mesaj?: string | null
          telefon?: string
        }
        Relationships: []
      }
      email_accounts: {
        Row: {
          config: Json
          created_at: string
          display_name: string
          from_email: string
          id: string
          is_default: boolean
          last_error: string | null
          last_sync_at: string | null
          provider: Database["public"]["Enums"]["email_provider"]
          reply_to: string | null
          signature: string | null
          status: Database["public"]["Enums"]["email_account_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          config?: Json
          created_at?: string
          display_name: string
          from_email: string
          id?: string
          is_default?: boolean
          last_error?: string | null
          last_sync_at?: string | null
          provider?: Database["public"]["Enums"]["email_provider"]
          reply_to?: string | null
          signature?: string | null
          status?: Database["public"]["Enums"]["email_account_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          config?: Json
          created_at?: string
          display_name?: string
          from_email?: string
          id?: string
          is_default?: boolean
          last_error?: string | null
          last_sync_at?: string | null
          provider?: Database["public"]["Enums"]["email_provider"]
          reply_to?: string | null
          signature?: string | null
          status?: Database["public"]["Enums"]["email_account_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      hakedis_deductions: {
        Row: {
          amount: number
          created_at: string
          deduction_type: string
          hakedis_id: string
          id: string
          label: string
          rate: number
          sort_order: number
          user_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          deduction_type?: string
          hakedis_id: string
          id?: string
          label?: string
          rate?: number
          sort_order?: number
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          deduction_type?: string
          hakedis_id?: string
          id?: string
          label?: string
          rate?: number
          sort_order?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hakedis_deductions_hakedis_id_fkey"
            columns: ["hakedis_id"]
            isOneToOne: false
            referencedRelation: "project_hakedis"
            referencedColumns: ["id"]
          },
        ]
      }
      hakedis_items: {
        Row: {
          contract_item_id: string | null
          created_at: string
          cumulative_qty: number
          current_qty: number
          description: string
          hakedis_id: string
          id: string
          poz_no: string
          previous_cumulative_qty: number
          quantity: number
          sort_order: number
          total_price: number
          unit: string
          unit_price: number
          user_id: string
        }
        Insert: {
          contract_item_id?: string | null
          created_at?: string
          cumulative_qty?: number
          current_qty?: number
          description?: string
          hakedis_id: string
          id?: string
          poz_no?: string
          previous_cumulative_qty?: number
          quantity?: number
          sort_order?: number
          total_price?: number
          unit?: string
          unit_price?: number
          user_id: string
        }
        Update: {
          contract_item_id?: string | null
          created_at?: string
          cumulative_qty?: number
          current_qty?: number
          description?: string
          hakedis_id?: string
          id?: string
          poz_no?: string
          previous_cumulative_qty?: number
          quantity?: number
          sort_order?: number
          total_price?: number
          unit?: string
          unit_price?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hakedis_items_contract_item_id_fkey"
            columns: ["contract_item_id"]
            isOneToOne: false
            referencedRelation: "contract_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hakedis_items_hakedis_id_fkey"
            columns: ["hakedis_id"]
            isOneToOne: false
            referencedRelation: "project_hakedis"
            referencedColumns: ["id"]
          },
        ]
      }
      hakedis_revisions: {
        Row: {
          created_at: string
          hakedis_id: string
          id: string
          note: string | null
          revision_number: number
          snapshot: Json
          user_id: string
        }
        Insert: {
          created_at?: string
          hakedis_id: string
          id?: string
          note?: string | null
          revision_number?: number
          snapshot?: Json
          user_id: string
        }
        Update: {
          created_at?: string
          hakedis_id?: string
          id?: string
          note?: string | null
          revision_number?: number
          snapshot?: Json
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hakedis_revisions_hakedis_id_fkey"
            columns: ["hakedis_id"]
            isOneToOne: false
            referencedRelation: "project_hakedis"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_asset_issues: {
        Row: {
          asset_id: string
          assignment_id: string | null
          created_at: string
          description: string
          document_url: string | null
          estimated_cost: number | null
          id: string
          issue_no: string
          issue_type: string
          occurred_on: string
          person_name: string | null
          photo_url: string | null
          project_id: string | null
          reported_by: string
          resolution_note: string | null
          reviewer_id: string | null
          reviewer_name: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          asset_id: string
          assignment_id?: string | null
          created_at?: string
          description: string
          document_url?: string | null
          estimated_cost?: number | null
          id?: string
          issue_no?: string
          issue_type: string
          occurred_on?: string
          person_name?: string | null
          photo_url?: string | null
          project_id?: string | null
          reported_by: string
          resolution_note?: string | null
          reviewer_id?: string | null
          reviewer_name?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          asset_id?: string
          assignment_id?: string | null
          created_at?: string
          description?: string
          document_url?: string | null
          estimated_cost?: number | null
          id?: string
          issue_no?: string
          issue_type?: string
          occurred_on?: string
          person_name?: string | null
          photo_url?: string | null
          project_id?: string | null
          reported_by?: string
          resolution_note?: string | null
          reviewer_id?: string | null
          reviewer_name?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_asset_issues_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "inventory_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_asset_issues_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "inventory_assignments"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_assets: {
        Row: {
          accessories: string[]
          asset_code: string
          brand: string | null
          category: string | null
          condition: string | null
          created_at: string
          equipment_ref: string | null
          id: string
          is_active: boolean
          model: string | null
          name: string
          notes: string | null
          photo_url: string | null
          purchase_date: string | null
          purchase_value: number | null
          serial_number: string | null
          status: string
          unit: string
          updated_at: string
          user_id: string
          warehouse_id: string | null
        }
        Insert: {
          accessories?: string[]
          asset_code?: string
          brand?: string | null
          category?: string | null
          condition?: string | null
          created_at?: string
          equipment_ref?: string | null
          id?: string
          is_active?: boolean
          model?: string | null
          name: string
          notes?: string | null
          photo_url?: string | null
          purchase_date?: string | null
          purchase_value?: number | null
          serial_number?: string | null
          status?: string
          unit?: string
          updated_at?: string
          user_id: string
          warehouse_id?: string | null
        }
        Update: {
          accessories?: string[]
          asset_code?: string
          brand?: string | null
          category?: string | null
          condition?: string | null
          created_at?: string
          equipment_ref?: string | null
          id?: string
          is_active?: boolean
          model?: string | null
          name?: string
          notes?: string | null
          photo_url?: string | null
          purchase_date?: string | null
          purchase_value?: number | null
          serial_number?: string | null
          status?: string
          unit?: string
          updated_at?: string
          user_id?: string
          warehouse_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_assets_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_assignment_events: {
        Row: {
          action: string
          actor_id: string
          actor_name: string | null
          assignment_id: string
          created_at: string
          id: string
          note: string | null
          payload: Json | null
          status: string | null
          user_id: string
        }
        Insert: {
          action: string
          actor_id: string
          actor_name?: string | null
          assignment_id: string
          created_at?: string
          id?: string
          note?: string | null
          payload?: Json | null
          status?: string | null
          user_id: string
        }
        Update: {
          action?: string
          actor_id?: string
          actor_name?: string | null
          assignment_id?: string
          created_at?: string
          id?: string
          note?: string | null
          payload?: Json | null
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_assignment_events_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "inventory_assignments"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_assignments: {
        Row: {
          accessories: string[]
          asset_id: string
          assignment_no: string
          condition_at_issue: string | null
          created_at: string
          damage_note: string | null
          department: string | null
          document_url: string | null
          expected_return_at: string
          extension_count: number
          id: string
          issued_at: string
          issued_by: string
          missing_accessories: string[]
          notes: string | null
          original_expected_return_at: string | null
          person_name: string
          personnel_id: string | null
          photo_url: string | null
          project_id: string | null
          received_by: string | null
          return_condition: string | null
          return_notes: string | null
          return_photo_url: string | null
          return_warehouse_id: string | null
          returned_at: string | null
          source_warehouse_id: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          accessories?: string[]
          asset_id: string
          assignment_no?: string
          condition_at_issue?: string | null
          created_at?: string
          damage_note?: string | null
          department?: string | null
          document_url?: string | null
          expected_return_at: string
          extension_count?: number
          id?: string
          issued_at?: string
          issued_by: string
          missing_accessories?: string[]
          notes?: string | null
          original_expected_return_at?: string | null
          person_name: string
          personnel_id?: string | null
          photo_url?: string | null
          project_id?: string | null
          received_by?: string | null
          return_condition?: string | null
          return_notes?: string | null
          return_photo_url?: string | null
          return_warehouse_id?: string | null
          returned_at?: string | null
          source_warehouse_id?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          accessories?: string[]
          asset_id?: string
          assignment_no?: string
          condition_at_issue?: string | null
          created_at?: string
          damage_note?: string | null
          department?: string | null
          document_url?: string | null
          expected_return_at?: string
          extension_count?: number
          id?: string
          issued_at?: string
          issued_by?: string
          missing_accessories?: string[]
          notes?: string | null
          original_expected_return_at?: string | null
          person_name?: string
          personnel_id?: string | null
          photo_url?: string | null
          project_id?: string | null
          received_by?: string | null
          return_condition?: string | null
          return_notes?: string | null
          return_photo_url?: string | null
          return_warehouse_id?: string | null
          returned_at?: string | null
          source_warehouse_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_assignments_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "inventory_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_assignments_personnel_id_fkey"
            columns: ["personnel_id"]
            isOneToOne: false
            referencedRelation: "personnel"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_assignments_return_warehouse_id_fkey"
            columns: ["return_warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_assignments_source_warehouse_id_fkey"
            columns: ["source_warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_audit_log: {
        Row: {
          action: string
          actor_id: string
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          new_value: Json | null
          previous_value: Json | null
          reason: string | null
          source_id: string | null
          source_type: string | null
          user_id: string
        }
        Insert: {
          action: string
          actor_id: string
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          new_value?: Json | null
          previous_value?: Json | null
          reason?: string | null
          source_id?: string | null
          source_type?: string | null
          user_id: string
        }
        Update: {
          action?: string
          actor_id?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          new_value?: Json | null
          previous_value?: Json | null
          reason?: string | null
          source_id?: string | null
          source_type?: string | null
          user_id?: string
        }
        Relationships: []
      }
      inventory_count_lines: {
        Row: {
          adjustment_movement_id: string | null
          applied_at: string | null
          counted_at: string | null
          counted_quantity: number | null
          counter_name: string | null
          created_at: string
          expected_quantity: number
          explanation: string | null
          id: string
          location: string | null
          material_code: string | null
          material_id: string
          material_name: string
          photo_url: string | null
          quantity_after: number | null
          recount_required: boolean
          session_id: string
          unit: string
          unit_cost: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          adjustment_movement_id?: string | null
          applied_at?: string | null
          counted_at?: string | null
          counted_quantity?: number | null
          counter_name?: string | null
          created_at?: string
          expected_quantity: number
          explanation?: string | null
          id?: string
          location?: string | null
          material_code?: string | null
          material_id: string
          material_name: string
          photo_url?: string | null
          quantity_after?: number | null
          recount_required?: boolean
          session_id: string
          unit: string
          unit_cost?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          adjustment_movement_id?: string | null
          applied_at?: string | null
          counted_at?: string | null
          counted_quantity?: number | null
          counter_name?: string | null
          created_at?: string
          expected_quantity?: number
          explanation?: string | null
          id?: string
          location?: string | null
          material_code?: string | null
          material_id?: string
          material_name?: string
          photo_url?: string | null
          quantity_after?: number | null
          recount_required?: boolean
          session_id?: string
          unit?: string
          unit_cost?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_count_lines_adjustment_movement_id_fkey"
            columns: ["adjustment_movement_id"]
            isOneToOne: false
            referencedRelation: "inventory_consumption"
            referencedColumns: ["source_movement_id"]
          },
          {
            foreignKeyName: "inventory_count_lines_adjustment_movement_id_fkey"
            columns: ["adjustment_movement_id"]
            isOneToOne: false
            referencedRelation: "inventory_scrap"
            referencedColumns: ["source_movement_id"]
          },
          {
            foreignKeyName: "inventory_count_lines_adjustment_movement_id_fkey"
            columns: ["adjustment_movement_id"]
            isOneToOne: false
            referencedRelation: "stock_movements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_count_lines_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_count_lines_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "inventory_count_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_count_sessions: {
        Row: {
          applied_at: string | null
          applied_by: string | null
          approved_at: string | null
          approver_id: string | null
          approver_name: string | null
          blind_count: boolean
          cancelled_at: string | null
          count_no: string
          count_type: string
          counters: string[]
          created_at: string
          created_by: string
          id: string
          notes: string | null
          planned_date: string
          review_note: string | null
          scope_kind: string
          scope_value: string | null
          snapshot_at: string | null
          started_at: string | null
          started_by: string | null
          status: string
          submitted_at: string | null
          updated_at: string
          user_id: string
          variance_threshold_pct: number
          warehouse_id: string
        }
        Insert: {
          applied_at?: string | null
          applied_by?: string | null
          approved_at?: string | null
          approver_id?: string | null
          approver_name?: string | null
          blind_count?: boolean
          cancelled_at?: string | null
          count_no?: string
          count_type?: string
          counters?: string[]
          created_at?: string
          created_by: string
          id?: string
          notes?: string | null
          planned_date?: string
          review_note?: string | null
          scope_kind?: string
          scope_value?: string | null
          snapshot_at?: string | null
          started_at?: string | null
          started_by?: string | null
          status?: string
          submitted_at?: string | null
          updated_at?: string
          user_id: string
          variance_threshold_pct?: number
          warehouse_id: string
        }
        Update: {
          applied_at?: string | null
          applied_by?: string | null
          approved_at?: string | null
          approver_id?: string | null
          approver_name?: string | null
          blind_count?: boolean
          cancelled_at?: string | null
          count_no?: string
          count_type?: string
          counters?: string[]
          created_at?: string
          created_by?: string
          id?: string
          notes?: string | null
          planned_date?: string
          review_note?: string | null
          scope_kind?: string
          scope_value?: string | null
          snapshot_at?: string | null
          started_at?: string | null
          started_by?: string | null
          status?: string
          submitted_at?: string | null
          updated_at?: string
          user_id?: string
          variance_threshold_pct?: number
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_count_sessions_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_transfer_documents: {
        Row: {
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          doc_type: string
          file_name: string
          file_path: string
          file_size: number
          id: string
          mime_type: string
          transfer_id: string
          updated_at: string
          uploaded_by: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          doc_type?: string
          file_name: string
          file_path: string
          file_size: number
          id?: string
          mime_type: string
          transfer_id: string
          updated_at?: string
          uploaded_by?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          doc_type?: string
          file_name?: string
          file_path?: string
          file_size?: number
          id?: string
          mime_type?: string
          transfer_id?: string
          updated_at?: string
          uploaded_by?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_transfer_documents_transfer_id_fkey"
            columns: ["transfer_id"]
            isOneToOne: false
            referencedRelation: "inventory_transfers"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_transfer_events: {
        Row: {
          action: string
          actor_id: string
          actor_name: string | null
          created_at: string
          id: string
          note: string | null
          payload: Json | null
          status: string
          transfer_id: string
          user_id: string
        }
        Insert: {
          action: string
          actor_id: string
          actor_name?: string | null
          created_at?: string
          id?: string
          note?: string | null
          payload?: Json | null
          status: string
          transfer_id: string
          user_id: string
        }
        Update: {
          action?: string
          actor_id?: string
          actor_name?: string | null
          created_at?: string
          id?: string
          note?: string | null
          payload?: Json | null
          status?: string
          transfer_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_transfer_events_transfer_id_fkey"
            columns: ["transfer_id"]
            isOneToOne: false
            referencedRelation: "inventory_transfers"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_transfers: {
        Row: {
          approved_at: string | null
          approver_id: string | null
          cancel_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          created_at: string
          damaged_quantity: number
          dest_warehouse_id: string
          discrepancy_note: string | null
          dispatch_movement_id: string | null
          dispatch_reference: string | null
          dispatched_at: string | null
          dispatched_quantity: number
          dispatcher_id: string | null
          expected_arrival: string | null
          expected_arrival_at: string | null
          id: string
          in_transit_quantity: number
          material_id: string
          missing_quantity: number
          notes: string | null
          project_id: string | null
          reason: string | null
          received_at: string | null
          received_quantity: number
          receiver_id: string | null
          rejected_quantity: number
          rejection_reason: string | null
          requested_at: string
          requested_quantity: number
          requester_id: string
          required_date: string | null
          revision_note: string | null
          source_warehouse_id: string
          status: string
          transfer_no: string
          unit: string
          unit_cost: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          approved_at?: string | null
          approver_id?: string | null
          cancel_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          created_at?: string
          damaged_quantity?: number
          dest_warehouse_id: string
          discrepancy_note?: string | null
          dispatch_movement_id?: string | null
          dispatch_reference?: string | null
          dispatched_at?: string | null
          dispatched_quantity?: number
          dispatcher_id?: string | null
          expected_arrival?: string | null
          expected_arrival_at?: string | null
          id?: string
          in_transit_quantity?: number
          material_id: string
          missing_quantity?: number
          notes?: string | null
          project_id?: string | null
          reason?: string | null
          received_at?: string | null
          received_quantity?: number
          receiver_id?: string | null
          rejected_quantity?: number
          rejection_reason?: string | null
          requested_at?: string
          requested_quantity: number
          requester_id: string
          required_date?: string | null
          revision_note?: string | null
          source_warehouse_id: string
          status?: string
          transfer_no?: string
          unit: string
          unit_cost?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          approved_at?: string | null
          approver_id?: string | null
          cancel_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          created_at?: string
          damaged_quantity?: number
          dest_warehouse_id?: string
          discrepancy_note?: string | null
          dispatch_movement_id?: string | null
          dispatch_reference?: string | null
          dispatched_at?: string | null
          dispatched_quantity?: number
          dispatcher_id?: string | null
          expected_arrival?: string | null
          expected_arrival_at?: string | null
          id?: string
          in_transit_quantity?: number
          material_id?: string
          missing_quantity?: number
          notes?: string | null
          project_id?: string | null
          reason?: string | null
          received_at?: string | null
          received_quantity?: number
          receiver_id?: string | null
          rejected_quantity?: number
          rejection_reason?: string | null
          requested_at?: string
          requested_quantity?: number
          requester_id?: string
          required_date?: string | null
          revision_note?: string | null
          source_warehouse_id?: string
          status?: string
          transfer_no?: string
          unit?: string
          unit_cost?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_transfers_dest_warehouse_id_fkey"
            columns: ["dest_warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_transfers_dispatch_movement_id_fkey"
            columns: ["dispatch_movement_id"]
            isOneToOne: false
            referencedRelation: "inventory_consumption"
            referencedColumns: ["source_movement_id"]
          },
          {
            foreignKeyName: "inventory_transfers_dispatch_movement_id_fkey"
            columns: ["dispatch_movement_id"]
            isOneToOne: false
            referencedRelation: "inventory_scrap"
            referencedColumns: ["source_movement_id"]
          },
          {
            foreignKeyName: "inventory_transfers_dispatch_movement_id_fkey"
            columns: ["dispatch_movement_id"]
            isOneToOne: false
            referencedRelation: "stock_movements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_transfers_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_transfers_source_warehouse_id_fkey"
            columns: ["source_warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount: number
          created_at: string
          currency: string
          id: string
          invoice_date: string
          iyzico_payment_id: string | null
          plan_name: string
          status: string
          subscription_id: string | null
          user_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          currency?: string
          id?: string
          invoice_date?: string
          iyzico_payment_id?: string | null
          plan_name: string
          status?: string
          subscription_id?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          id?: string
          invoice_date?: string
          iyzico_payment_id?: string | null
          plan_name?: string
          status?: string
          subscription_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "user_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      listings: {
        Row: {
          contact: string
          created_at: string
          description: string
          floor_info: string | null
          id: string
          listing_type: string
          media_urls: Json | null
          parcel_ada: string | null
          parcel_area_sqm: number | null
          parcel_center_lat: number | null
          parcel_center_lng: number | null
          parcel_coords: Json | null
          parcel_il: string | null
          parcel_ilce: string | null
          parcel_parsel: string | null
          price: number
          property_type: string | null
          rooms: string | null
          sqm: number | null
          status: string
          title: string
          updated_at: string
          user_id: string
          video_status: string | null
          video_url: string | null
        }
        Insert: {
          contact?: string
          created_at?: string
          description?: string
          floor_info?: string | null
          id?: string
          listing_type?: string
          media_urls?: Json | null
          parcel_ada?: string | null
          parcel_area_sqm?: number | null
          parcel_center_lat?: number | null
          parcel_center_lng?: number | null
          parcel_coords?: Json | null
          parcel_il?: string | null
          parcel_ilce?: string | null
          parcel_parsel?: string | null
          price?: number
          property_type?: string | null
          rooms?: string | null
          sqm?: number | null
          status?: string
          title?: string
          updated_at?: string
          user_id: string
          video_status?: string | null
          video_url?: string | null
        }
        Update: {
          contact?: string
          created_at?: string
          description?: string
          floor_info?: string | null
          id?: string
          listing_type?: string
          media_urls?: Json | null
          parcel_ada?: string | null
          parcel_area_sqm?: number | null
          parcel_center_lat?: number | null
          parcel_center_lng?: number | null
          parcel_coords?: Json | null
          parcel_il?: string | null
          parcel_ilce?: string | null
          parcel_parsel?: string | null
          price?: number
          property_type?: string | null
          rooms?: string | null
          sqm?: number | null
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
          video_status?: string | null
          video_url?: string | null
        }
        Relationships: []
      }
      material_entries: {
        Row: {
          created_at: string
          entry_date: string
          id: string
          material_id: string
          note: string | null
          quantity: number
          source_id: string | null
          source_type: string | null
          supplier: string
          total_amount: number
          unit_price: number
          user_id: string
          waybill_no: string | null
          waybill_photo_url: string | null
        }
        Insert: {
          created_at?: string
          entry_date?: string
          id?: string
          material_id: string
          note?: string | null
          quantity?: number
          source_id?: string | null
          source_type?: string | null
          supplier?: string
          total_amount?: number
          unit_price?: number
          user_id: string
          waybill_no?: string | null
          waybill_photo_url?: string | null
        }
        Update: {
          created_at?: string
          entry_date?: string
          id?: string
          material_id?: string
          note?: string | null
          quantity?: number
          source_id?: string | null
          source_type?: string | null
          supplier?: string
          total_amount?: number
          unit_price?: number
          user_id?: string
          waybill_no?: string | null
          waybill_photo_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "material_entries_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
        ]
      }
      material_exits: {
        Row: {
          contract_item_id: string | null
          created_at: string
          exit_date: string
          id: string
          location: string | null
          material_id: string
          note: string | null
          quantity: number
          source_id: string | null
          source_type: string | null
          user_id: string
        }
        Insert: {
          contract_item_id?: string | null
          created_at?: string
          exit_date?: string
          id?: string
          location?: string | null
          material_id: string
          note?: string | null
          quantity?: number
          source_id?: string | null
          source_type?: string | null
          user_id: string
        }
        Update: {
          contract_item_id?: string | null
          created_at?: string
          exit_date?: string
          id?: string
          location?: string | null
          material_id?: string
          note?: string | null
          quantity?: number
          source_id?: string | null
          source_type?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "material_exits_contract_item_id_fkey"
            columns: ["contract_item_id"]
            isOneToOne: false
            referencedRelation: "contract_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_exits_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
        ]
      }
      material_norms: {
        Row: {
          contract_item_id: string
          created_at: string
          id: string
          material_id: string
          norm_quantity: number
          unit: string
          updated_at: string
          user_id: string
        }
        Insert: {
          contract_item_id: string
          created_at?: string
          id?: string
          material_id: string
          norm_quantity?: number
          unit?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          contract_item_id?: string
          created_at?: string
          id?: string
          material_id?: string
          norm_quantity?: number
          unit?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "material_norms_contract_item_id_fkey"
            columns: ["contract_item_id"]
            isOneToOne: false
            referencedRelation: "contract_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_norms_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
        ]
      }
      materials: {
        Row: {
          allowed_units: string[]
          category: string | null
          code: string | null
          created_at: string
          data_review_reason: string | null
          data_review_required: boolean
          default_supplier: string | null
          default_warehouse_id: string | null
          id: string
          is_active: boolean
          min_stock: number
          name: string
          project_id: string
          reorder_point: number | null
          safety_stock: number | null
          stock_type: string
          unit: string
          updated_at: string
          user_id: string
        }
        Insert: {
          allowed_units?: string[]
          category?: string | null
          code?: string | null
          created_at?: string
          data_review_reason?: string | null
          data_review_required?: boolean
          default_supplier?: string | null
          default_warehouse_id?: string | null
          id?: string
          is_active?: boolean
          min_stock?: number
          name?: string
          project_id: string
          reorder_point?: number | null
          safety_stock?: number | null
          stock_type?: string
          unit?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          allowed_units?: string[]
          category?: string | null
          code?: string | null
          created_at?: string
          data_review_reason?: string | null
          data_review_required?: boolean
          default_supplier?: string | null
          default_warehouse_id?: string | null
          id?: string
          is_active?: boolean
          min_stock?: number
          name?: string
          project_id?: string
          reorder_point?: number | null
          safety_stock?: number | null
          stock_type?: string
          unit?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "materials_default_warehouse_id_fkey"
            columns: ["default_warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_action_items: {
        Row: {
          assignee_name: string | null
          assignee_user_id: string | null
          created_at: string
          created_task_id: string | null
          description: string | null
          due_date: string | null
          id: string
          meeting_id: string
          notified_at: string | null
          notified_channels: string[]
          priority: string
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          assignee_name?: string | null
          assignee_user_id?: string | null
          created_at?: string
          created_task_id?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          meeting_id: string
          notified_at?: string | null
          notified_channels?: string[]
          priority?: string
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          assignee_name?: string | null
          assignee_user_id?: string | null
          created_at?: string
          created_task_id?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          meeting_id?: string
          notified_at?: string | null
          notified_channels?: string[]
          priority?: string
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meeting_action_items_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_analyses: {
        Row: {
          action_items: Json
          decisions: Json
          generated_at: string
          id: string
          meeting_id: string
          model: string | null
          next_meeting: Json | null
          numbers: Json
          prompt_version: string | null
          questions: Json
          risks: Json
          summary: string | null
          user_id: string
        }
        Insert: {
          action_items?: Json
          decisions?: Json
          generated_at?: string
          id?: string
          meeting_id: string
          model?: string | null
          next_meeting?: Json | null
          numbers?: Json
          prompt_version?: string | null
          questions?: Json
          risks?: Json
          summary?: string | null
          user_id: string
        }
        Update: {
          action_items?: Json
          decisions?: Json
          generated_at?: string
          id?: string
          meeting_id?: string
          model?: string | null
          next_meeting?: Json | null
          numbers?: Json
          prompt_version?: string | null
          questions?: Json
          risks?: Json
          summary?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meeting_analyses_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: true
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_participants: {
        Row: {
          attended: boolean
          company: string | null
          contact_ref: Json | null
          created_at: string
          display_name: string
          id: string
          joined_at: string | null
          left_at: string | null
          meeting_id: string
          role: string | null
          speaking_seconds: number
          user_id: string
        }
        Insert: {
          attended?: boolean
          company?: string | null
          contact_ref?: Json | null
          created_at?: string
          display_name: string
          id?: string
          joined_at?: string | null
          left_at?: string | null
          meeting_id: string
          role?: string | null
          speaking_seconds?: number
          user_id: string
        }
        Update: {
          attended?: boolean
          company?: string | null
          contact_ref?: Json | null
          created_at?: string
          display_name?: string
          id?: string
          joined_at?: string | null
          left_at?: string | null
          meeting_id?: string
          role?: string | null
          speaking_seconds?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meeting_participants_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_transcripts: {
        Row: {
          created_at: string
          ended_at_ms: number
          id: string
          is_final: boolean
          meeting_id: string
          seq: number
          speaker_label: string | null
          started_at_ms: number
          text: string
          user_id: string
        }
        Insert: {
          created_at?: string
          ended_at_ms?: number
          id?: string
          is_final?: boolean
          meeting_id: string
          seq?: number
          speaker_label?: string | null
          started_at_ms?: number
          text: string
          user_id: string
        }
        Update: {
          created_at?: string
          ended_at_ms?: number
          id?: string
          is_final?: boolean
          meeting_id?: string
          seq?: number
          speaker_label?: string | null
          started_at_ms?: number
          text?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meeting_transcripts_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
        ]
      }
      meetings: {
        Row: {
          audio_path: string | null
          created_at: string
          duration_seconds: number
          ended_at: string | null
          id: string
          language: string
          location: string | null
          meeting_type: string
          metadata: Json
          project_id: string | null
          started_at: string | null
          status: string
          tags: string[]
          team_id: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          audio_path?: string | null
          created_at?: string
          duration_seconds?: number
          ended_at?: string | null
          id?: string
          language?: string
          location?: string | null
          meeting_type?: string
          metadata?: Json
          project_id?: string | null
          started_at?: string | null
          status?: string
          tags?: string[]
          team_id?: string | null
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          audio_path?: string | null
          created_at?: string
          duration_seconds?: number
          ended_at?: string | null
          id?: string
          language?: string
          location?: string | null
          meeting_type?: string
          metadata?: Json
          project_id?: string | null
          started_at?: string | null
          status?: string
          tags?: string[]
          team_id?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meetings_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "office_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meetings_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      memory_dismissed_categories: {
        Row: {
          category: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          category: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      notification_history: {
        Row: {
          body: string
          click_url: string | null
          created_at: string
          id: string
          is_read: boolean
          metadata: Json | null
          notification_type: string
          title: string
          user_id: string
        }
        Insert: {
          body: string
          click_url?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          metadata?: Json | null
          notification_type?: string
          title: string
          user_id: string
        }
        Update: {
          body?: string
          click_url?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          metadata?: Json | null
          notification_type?: string
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      notification_preferences: {
        Row: {
          created_at: string
          id: string
          notify_hakedis_approval: boolean
          notify_hakedis_pending: boolean
          notify_qr_entry: boolean
          notify_stock_alert: boolean
          notify_subcontractor_payment: boolean
          payment_due_reminder: boolean
          payment_overdue_reminder: boolean
          push_check_due_soon: boolean
          push_enabled: boolean
          push_hakedis_approval_request: boolean
          push_payment_overdue: boolean
          quiet_hours_end: string | null
          quiet_hours_start: string | null
          updated_at: string
          user_id: string
          weekly_summary: boolean
          whatsapp_enabled: boolean
          whatsapp_number: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          notify_hakedis_approval?: boolean
          notify_hakedis_pending?: boolean
          notify_qr_entry?: boolean
          notify_stock_alert?: boolean
          notify_subcontractor_payment?: boolean
          payment_due_reminder?: boolean
          payment_overdue_reminder?: boolean
          push_check_due_soon?: boolean
          push_enabled?: boolean
          push_hakedis_approval_request?: boolean
          push_payment_overdue?: boolean
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          updated_at?: string
          user_id: string
          weekly_summary?: boolean
          whatsapp_enabled?: boolean
          whatsapp_number?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          notify_hakedis_approval?: boolean
          notify_hakedis_pending?: boolean
          notify_qr_entry?: boolean
          notify_stock_alert?: boolean
          notify_subcontractor_payment?: boolean
          payment_due_reminder?: boolean
          payment_overdue_reminder?: boolean
          push_check_due_soon?: boolean
          push_enabled?: boolean
          push_hakedis_approval_request?: boolean
          push_payment_overdue?: boolean
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          updated_at?: string
          user_id?: string
          weekly_summary?: boolean
          whatsapp_enabled?: boolean
          whatsapp_number?: string | null
        }
        Relationships: []
      }
      notification_reads: {
        Row: {
          id: string
          notification_key: string
          read_at: string
          user_id: string
        }
        Insert: {
          id?: string
          notification_key: string
          read_at?: string
          user_id: string
        }
        Update: {
          id?: string
          notification_key?: string
          read_at?: string
          user_id?: string
        }
        Relationships: []
      }
      office_invitations: {
        Row: {
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string
          role: string
          status: string
          team_id: string
          token: string
        }
        Insert: {
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by: string
          role?: string
          status?: string
          team_id: string
          token?: string
        }
        Update: {
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          role?: string
          status?: string
          team_id?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "office_invitations_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "office_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "office_invitations_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      office_members: {
        Row: {
          id: string
          joined_at: string
          role: string
          status: string
          suspended_at: string | null
          team_id: string
          user_id: string
        }
        Insert: {
          id?: string
          joined_at?: string
          role?: string
          status?: string
          suspended_at?: string | null
          team_id: string
          user_id: string
        }
        Update: {
          id?: string
          joined_at?: string
          role?: string
          status?: string
          suspended_at?: string | null
          team_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "office_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "office_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "office_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      office_teams: {
        Row: {
          created_at: string
          id: string
          max_members: number
          name: string
          owner_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          max_members?: number
          name?: string
          owner_id: string
        }
        Update: {
          created_at?: string
          id?: string
          max_members?: number
          name?: string
          owner_id?: string
        }
        Relationships: []
      }
      organization_feature_overrides: {
        Row: {
          created_at: string
          enabled: boolean
          expires_at: string | null
          feature_key: string
          id: string
          reason: string | null
          set_by: string | null
          team_id: string
        }
        Insert: {
          created_at?: string
          enabled: boolean
          expires_at?: string | null
          feature_key: string
          id?: string
          reason?: string | null
          set_by?: string | null
          team_id: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          expires_at?: string | null
          feature_key?: string
          id?: string
          reason?: string | null
          set_by?: string | null
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_feature_overrides_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "office_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_feature_overrides_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_limit_overrides: {
        Row: {
          created_at: string
          enforcement: string | null
          expires_at: string | null
          grace_pct: number | null
          id: string
          limit_key: string
          limit_value: number
          reason: string | null
          set_by: string | null
          team_id: string
        }
        Insert: {
          created_at?: string
          enforcement?: string | null
          expires_at?: string | null
          grace_pct?: number | null
          id?: string
          limit_key: string
          limit_value: number
          reason?: string | null
          set_by?: string | null
          team_id: string
        }
        Update: {
          created_at?: string
          enforcement?: string | null
          expires_at?: string | null
          grace_pct?: number | null
          id?: string
          limit_key?: string
          limit_value?: number
          reason?: string | null
          set_by?: string | null
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_limit_overrides_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "office_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_limit_overrides_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_transactions: {
        Row: {
          amount: number
          created_at: string
          currency: string
          error_message: string | null
          id: string
          iyzico_payment_id: string | null
          iyzico_token: string | null
          plan_name: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          error_message?: string | null
          id?: string
          iyzico_payment_id?: string | null
          iyzico_token?: string | null
          plan_name: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          error_message?: string | null
          id?: string
          iyzico_payment_id?: string | null
          iyzico_token?: string | null
          plan_name?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      personnel: {
        Row: {
          created_at: string
          daily_wage: number | null
          employment_type: Database["public"]["Enums"]["employment_type"]
          full_name: string
          id: string
          is_active: boolean
          monthly_salary: number | null
          note: string | null
          occupation: string | null
          phone: string | null
          phone_normalized: string | null
          subcontractor_id: string | null
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          daily_wage?: number | null
          employment_type?: Database["public"]["Enums"]["employment_type"]
          full_name: string
          id?: string
          is_active?: boolean
          monthly_salary?: number | null
          note?: string | null
          occupation?: string | null
          phone?: string | null
          phone_normalized?: string | null
          subcontractor_id?: string | null
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          daily_wage?: number | null
          employment_type?: Database["public"]["Enums"]["employment_type"]
          full_name?: string
          id?: string
          is_active?: boolean
          monthly_salary?: number | null
          note?: string | null
          occupation?: string | null
          phone?: string | null
          phone_normalized?: string | null
          subcontractor_id?: string | null
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "personnel_subcontractor_id_fkey"
            columns: ["subcontractor_id"]
            isOneToOne: false
            referencedRelation: "subcontractors"
            referencedColumns: ["id"]
          },
        ]
      }
      personnel_project_assignments: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          personnel_id: string
          project_id: string
          salary_share_amount: number | null
          salary_share_percent: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          personnel_id: string
          project_id: string
          salary_share_amount?: number | null
          salary_share_percent?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          personnel_id?: string
          project_id?: string
          salary_share_amount?: number | null
          salary_share_percent?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "personnel_project_assignments_personnel_id_fkey"
            columns: ["personnel_id"]
            isOneToOne: false
            referencedRelation: "personnel"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_features: {
        Row: {
          enabled: boolean
          feature_key: string
          plan_internal_key: string
          updated_at: string
        }
        Insert: {
          enabled?: boolean
          feature_key: string
          plan_internal_key: string
          updated_at?: string
        }
        Update: {
          enabled?: boolean
          feature_key?: string
          plan_internal_key?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "plan_features_plan_internal_key_fkey"
            columns: ["plan_internal_key"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["internal_key"]
          },
        ]
      }
      plan_limits: {
        Row: {
          enforcement: string
          grace_pct: number
          limit_key: string
          limit_value: number
          plan_internal_key: string
          updated_at: string
        }
        Insert: {
          enforcement?: string
          grace_pct?: number
          limit_key: string
          limit_value: number
          plan_internal_key: string
          updated_at?: string
        }
        Update: {
          enforcement?: string
          grace_pct?: number
          limit_key?: string
          limit_value?: number
          plan_internal_key?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "plan_limits_plan_internal_key_fkey"
            columns: ["plan_internal_key"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["internal_key"]
          },
        ]
      }
      plans: {
        Row: {
          created_at: string
          display_name: string
          internal_key: string
          is_public: boolean
          public_key: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          display_name: string
          internal_key: string
          is_public?: boolean
          public_key: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          display_name?: string
          internal_key?: string
          is_public?: boolean
          public_key?: string
          sort_order?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          city: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          plan: string
          role: string
          theme: string
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          city?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          plan?: string
          role?: string
          theme?: string
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          city?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          plan?: string
          role?: string
          theme?: string
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      project_expenses: {
        Row: {
          amount: number
          category: string
          created_at: string
          description: string
          expense_date: string
          has_invoice: boolean
          id: string
          invoice_no: string | null
          invoice_url: string | null
          note: string | null
          project_id: string
          source: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number
          category?: string
          created_at?: string
          description?: string
          expense_date?: string
          has_invoice?: boolean
          id?: string
          invoice_no?: string | null
          invoice_url?: string | null
          note?: string | null
          project_id: string
          source?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          description?: string
          expense_date?: string
          has_invoice?: boolean
          id?: string
          invoice_no?: string | null
          invoice_url?: string | null
          note?: string | null
          project_id?: string
          source?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      project_files: {
        Row: {
          created_at: string
          file_name: string
          file_size: number | null
          file_type: string | null
          file_url: string
          id: string
          project_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          file_name: string
          file_size?: number | null
          file_type?: string | null
          file_url: string
          id?: string
          project_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          file_name?: string
          file_size?: number | null
          file_type?: string | null
          file_url?: string
          id?: string
          project_id?: string
          user_id?: string
        }
        Relationships: []
      }
      project_hakedis: {
        Row: {
          amount: number
          approval_sent_at: string | null
          approval_status: string
          approval_token: string | null
          approved_at: string | null
          client_email: string | null
          client_note: string | null
          contract_id: string | null
          created_at: string
          deductions_total: number
          expected_payment_date: string | null
          gross_total: number
          id: string
          kdv: number
          net: number
          net_total: number
          payment_date: string | null
          period: string
          project_id: string
          reminder_days_before: number | null
          revision_count: number
          status: string
          status_color: string
          user_id: string
        }
        Insert: {
          amount?: number
          approval_sent_at?: string | null
          approval_status?: string
          approval_token?: string | null
          approved_at?: string | null
          client_email?: string | null
          client_note?: string | null
          contract_id?: string | null
          created_at?: string
          deductions_total?: number
          expected_payment_date?: string | null
          gross_total?: number
          id?: string
          kdv?: number
          net?: number
          net_total?: number
          payment_date?: string | null
          period: string
          project_id: string
          reminder_days_before?: number | null
          revision_count?: number
          status?: string
          status_color?: string
          user_id: string
        }
        Update: {
          amount?: number
          approval_sent_at?: string | null
          approval_status?: string
          approval_token?: string | null
          approved_at?: string | null
          client_email?: string | null
          client_note?: string | null
          contract_id?: string | null
          created_at?: string
          deductions_total?: number
          expected_payment_date?: string | null
          gross_total?: number
          id?: string
          kdv?: number
          net?: number
          net_total?: number
          payment_date?: string | null
          period?: string
          project_id?: string
          reminder_days_before?: number | null
          revision_count?: number
          status?: string
          status_color?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_hakedis_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      project_invitations: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string | null
          expires_at: string
          id: string
          invited_by: string
          phone: string | null
          project_id: string
          role: Database["public"]["Enums"]["project_role"]
          status: string
          token: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email?: string | null
          expires_at?: string
          id?: string
          invited_by: string
          phone?: string | null
          project_id: string
          role?: Database["public"]["Enums"]["project_role"]
          status?: string
          token?: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string | null
          expires_at?: string
          id?: string
          invited_by?: string
          phone?: string | null
          project_id?: string
          role?: Database["public"]["Enums"]["project_role"]
          status?: string
          token?: string
        }
        Relationships: []
      }
      project_member_permissions: {
        Row: {
          granted: boolean
          id: string
          permission_key: string
          project_id: string
          set_by: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          granted?: boolean
          id?: string
          permission_key: string
          project_id: string
          set_by?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          granted?: boolean
          id?: string
          permission_key?: string
          project_id?: string
          set_by?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      project_members: {
        Row: {
          created_at: string
          id: string
          invited_by: string | null
          joined_at: string
          project_id: string
          role: Database["public"]["Enums"]["project_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          invited_by?: string | null
          joined_at?: string
          project_id: string
          role?: Database["public"]["Enums"]["project_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          invited_by?: string | null
          joined_at?: string
          project_id?: string
          role?: Database["public"]["Enums"]["project_role"]
          user_id?: string
        }
        Relationships: []
      }
      project_milestones: {
        Row: {
          completed: boolean
          created_at: string
          id: string
          milestone_date: string
          project_id: string
          sort_order: number
          title: string
          user_id: string
        }
        Insert: {
          completed?: boolean
          created_at?: string
          id?: string
          milestone_date?: string
          project_id: string
          sort_order?: number
          title: string
          user_id: string
        }
        Update: {
          completed?: boolean
          created_at?: string
          id?: string
          milestone_date?: string
          project_id?: string
          sort_order?: number
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      project_notes: {
        Row: {
          content: string
          created_at: string
          id: string
          project_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          project_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          project_id?: string
          user_id?: string
        }
        Relationships: []
      }
      project_qr_codes: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          project_id: string
          token: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string
          id?: string
          project_id: string
          token?: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          project_id?: string
          token?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_qr_codes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          budget: string
          client: string
          contract_amount: number | null
          created_at: string
          description: string
          end_date: string
          id: string
          location: string
          manager: string
          name: string
          progress: number
          site_responsible: string
          start_date: string
          status: string
          status_color: string
          user_id: string
        }
        Insert: {
          budget?: string
          client?: string
          contract_amount?: number | null
          created_at?: string
          description?: string
          end_date?: string
          id?: string
          location?: string
          manager?: string
          name: string
          progress?: number
          site_responsible?: string
          start_date?: string
          status?: string
          status_color?: string
          user_id: string
        }
        Update: {
          budget?: string
          client?: string
          contract_amount?: number | null
          created_at?: string
          description?: string
          end_date?: string
          id?: string
          location?: string
          manager?: string
          name?: string
          progress?: number
          site_responsible?: string
          start_date?: string
          status?: string
          status_color?: string
          user_id?: string
        }
        Relationships: []
      }
      purchase_order_deliveries: {
        Row: {
          actual_arrival: string | null
          arrived_at: string | null
          carrier: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string
          created_by: string | null
          delivery_no: string
          destination: string | null
          discrepancy_note: string | null
          dispatch_date: string | null
          dispatched_at: string | null
          driver_name: string | null
          driver_phone: string | null
          eta_changed_at: string | null
          expected_arrival: string | null
          expected_arrival_time: string | null
          id: string
          notes: string | null
          order_id: string
          photos: Json
          previous_expected_arrival: string | null
          project_id: string | null
          return_note: string | null
          status: string
          updated_at: string
          vehicle_plate: string | null
          warehouse_name: string | null
          waybill_name: string | null
          waybill_no: string | null
          waybill_url: string | null
        }
        Insert: {
          actual_arrival?: string | null
          arrived_at?: string | null
          carrier?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          created_by?: string | null
          delivery_no: string
          destination?: string | null
          discrepancy_note?: string | null
          dispatch_date?: string | null
          dispatched_at?: string | null
          driver_name?: string | null
          driver_phone?: string | null
          eta_changed_at?: string | null
          expected_arrival?: string | null
          expected_arrival_time?: string | null
          id?: string
          notes?: string | null
          order_id: string
          photos?: Json
          previous_expected_arrival?: string | null
          project_id?: string | null
          return_note?: string | null
          status?: string
          updated_at?: string
          vehicle_plate?: string | null
          warehouse_name?: string | null
          waybill_name?: string | null
          waybill_no?: string | null
          waybill_url?: string | null
        }
        Update: {
          actual_arrival?: string | null
          arrived_at?: string | null
          carrier?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          created_by?: string | null
          delivery_no?: string
          destination?: string | null
          discrepancy_note?: string | null
          dispatch_date?: string | null
          dispatched_at?: string | null
          driver_name?: string | null
          driver_phone?: string | null
          eta_changed_at?: string | null
          expected_arrival?: string | null
          expected_arrival_time?: string | null
          id?: string
          notes?: string | null
          order_id?: string
          photos?: Json
          previous_expected_arrival?: string | null
          project_id?: string | null
          return_note?: string | null
          status?: string
          updated_at?: string
          vehicle_plate?: string | null
          warehouse_name?: string | null
          waybill_name?: string | null
          waybill_no?: string | null
          waybill_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_order_deliveries_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_order_delivery_items: {
        Row: {
          accepted_quantity: number
          batch_no: string | null
          created_at: string
          damaged_quantity: number
          delivered_quantity: number
          delivery_id: string
          id: string
          note: string | null
          order_item_id: string
          rejected_quantity: number
          warehouse_name: string | null
        }
        Insert: {
          accepted_quantity?: number
          batch_no?: string | null
          created_at?: string
          damaged_quantity?: number
          delivered_quantity?: number
          delivery_id: string
          id?: string
          note?: string | null
          order_item_id: string
          rejected_quantity?: number
          warehouse_name?: string | null
        }
        Update: {
          accepted_quantity?: number
          batch_no?: string | null
          created_at?: string
          damaged_quantity?: number
          delivered_quantity?: number
          delivery_id?: string
          id?: string
          note?: string | null
          order_item_id?: string
          rejected_quantity?: number
          warehouse_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_order_delivery_items_delivery_id_fkey"
            columns: ["delivery_id"]
            isOneToOne: false
            referencedRelation: "purchase_order_deliveries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_delivery_items_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "purchase_order_items"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_order_events: {
        Row: {
          actor: string
          created_at: string
          detail: string | null
          event: string
          from_value: string | null
          id: string
          order_id: string
          ref_id: string | null
          ref_table: string | null
          to_value: string | null
        }
        Insert: {
          actor: string
          created_at?: string
          detail?: string | null
          event: string
          from_value?: string | null
          id?: string
          order_id: string
          ref_id?: string | null
          ref_table?: string | null
          to_value?: string | null
        }
        Update: {
          actor?: string
          created_at?: string
          detail?: string | null
          event?: string
          from_value?: string | null
          id?: string
          order_id?: string
          ref_id?: string | null
          ref_table?: string | null
          to_value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_order_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_order_installments: {
        Row: {
          amount: number
          condition_note: string | null
          created_at: string
          currency: string
          due_date: string
          id: string
          installment_no: number
          order_id: string
          paid_amount: number
          payment_type: string
          percentage: number | null
          planned_account_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          amount: number
          condition_note?: string | null
          created_at?: string
          currency?: string
          due_date: string
          id?: string
          installment_no: number
          order_id: string
          paid_amount?: number
          payment_type: string
          percentage?: number | null
          planned_account_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          condition_note?: string | null
          created_at?: string
          currency?: string
          due_date?: string
          id?: string
          installment_no?: number
          order_id?: string
          paid_amount?: number
          payment_type?: string
          percentage?: number | null
          planned_account_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_order_installments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_installments_planned_account_id_fkey"
            columns: ["planned_account_id"]
            isOneToOne: false
            referencedRelation: "cash_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_order_invoices: {
        Row: {
          created_at: string
          created_by: string | null
          currency: string
          delivery_id: string | null
          due_date: string | null
          e_invoice_id: string | null
          file_name: string | null
          file_url: string | null
          id: string
          invoice_date: string
          invoice_no: string
          match_result: Json
          notes: string | null
          order_id: string
          status: string
          subtotal: number
          total: number
          updated_at: string
          vat_amount: number
          withholding: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          currency?: string
          delivery_id?: string | null
          due_date?: string | null
          e_invoice_id?: string | null
          file_name?: string | null
          file_url?: string | null
          id?: string
          invoice_date: string
          invoice_no: string
          match_result?: Json
          notes?: string | null
          order_id: string
          status?: string
          subtotal?: number
          total?: number
          updated_at?: string
          vat_amount?: number
          withholding?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          currency?: string
          delivery_id?: string | null
          due_date?: string | null
          e_invoice_id?: string | null
          file_name?: string | null
          file_url?: string | null
          id?: string
          invoice_date?: string
          invoice_no?: string
          match_result?: Json
          notes?: string | null
          order_id?: string
          status?: string
          subtotal?: number
          total?: number
          updated_at?: string
          vat_amount?: number
          withholding?: number
        }
        Relationships: [
          {
            foreignKeyName: "purchase_order_invoices_delivery_id_fkey"
            columns: ["delivery_id"]
            isOneToOne: false
            referencedRelation: "purchase_order_deliveries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_invoices_e_invoice_id_fkey"
            columns: ["e_invoice_id"]
            isOneToOne: false
            referencedRelation: "e_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_invoices_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_order_items: {
        Row: {
          accepted_quantity: number
          cost_code: string | null
          created_at: string
          delivered_quantity: number
          description: string | null
          id: string
          item_type: string
          line_total: number
          material_id: string | null
          name: string
          order_id: string
          quantity: number
          rejected_quantity: number
          sort_order: number
          unit: string
          unit_price: number
          updated_at: string
          vat_rate: number
          warehouse_name: string | null
        }
        Insert: {
          accepted_quantity?: number
          cost_code?: string | null
          created_at?: string
          delivered_quantity?: number
          description?: string | null
          id?: string
          item_type?: string
          line_total?: number
          material_id?: string | null
          name: string
          order_id: string
          quantity?: number
          rejected_quantity?: number
          sort_order?: number
          unit?: string
          unit_price?: number
          updated_at?: string
          vat_rate?: number
          warehouse_name?: string | null
        }
        Update: {
          accepted_quantity?: number
          cost_code?: string | null
          created_at?: string
          delivered_quantity?: number
          description?: string | null
          id?: string
          item_type?: string
          line_total?: number
          material_id?: string | null
          name?: string
          order_id?: string
          quantity?: number
          rejected_quantity?: number
          sort_order?: number
          unit?: string
          unit_price?: number
          updated_at?: string
          vat_rate?: number
          warehouse_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_order_items_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_order_payments: {
        Row: {
          account_id: string | null
          amount: number
          cash_payment_id: string | null
          created_at: string
          created_by: string | null
          currency: string
          description: string | null
          id: string
          installment_id: string | null
          method: string
          order_id: string
          payment_date: string
          receipt_url: string | null
          reference_no: string | null
          reversed_at: string | null
          reversed_by: string | null
        }
        Insert: {
          account_id?: string | null
          amount: number
          cash_payment_id?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          description?: string | null
          id?: string
          installment_id?: string | null
          method: string
          order_id: string
          payment_date?: string
          receipt_url?: string | null
          reference_no?: string | null
          reversed_at?: string | null
          reversed_by?: string | null
        }
        Update: {
          account_id?: string | null
          amount?: number
          cash_payment_id?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          description?: string | null
          id?: string
          installment_id?: string | null
          method?: string
          order_id?: string
          payment_date?: string
          receipt_url?: string | null
          reference_no?: string | null
          reversed_at?: string | null
          reversed_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_order_payments_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "cash_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_payments_cash_payment_id_fkey"
            columns: ["cash_payment_id"]
            isOneToOne: false
            referencedRelation: "cash_payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_payments_installment_id_fkey"
            columns: ["installment_id"]
            isOneToOne: false
            referencedRelation: "purchase_order_installments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_order_receipts: {
        Row: {
          accepted_at: string
          attachment_url: string | null
          created_at: string
          created_by: string | null
          delivery_id: string
          discrepancy_note: string | null
          id: string
          order_id: string
          photos: Json
          receipt_no: string
          received_by: string | null
          stock_posted: boolean
          stock_posted_at: string | null
          warehouse_name: string | null
        }
        Insert: {
          accepted_at?: string
          attachment_url?: string | null
          created_at?: string
          created_by?: string | null
          delivery_id: string
          discrepancy_note?: string | null
          id?: string
          order_id: string
          photos?: Json
          receipt_no: string
          received_by?: string | null
          stock_posted?: boolean
          stock_posted_at?: string | null
          warehouse_name?: string | null
        }
        Update: {
          accepted_at?: string
          attachment_url?: string | null
          created_at?: string
          created_by?: string | null
          delivery_id?: string
          discrepancy_note?: string | null
          id?: string
          order_id?: string
          photos?: Json
          receipt_no?: string
          received_by?: string | null
          stock_posted?: boolean
          stock_posted_at?: string | null
          warehouse_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_order_receipts_delivery_id_fkey"
            columns: ["delivery_id"]
            isOneToOne: true
            referencedRelation: "purchase_order_deliveries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_receipts_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_orders: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          approver_name: string | null
          approver_user_id: string | null
          budget_override_reason: string | null
          cancelled_at: string | null
          category: string | null
          completed_at: string | null
          created_at: string
          created_by: string | null
          currency: string
          delivery_address: string | null
          delivery_contact: string | null
          delivery_status: string
          discount: number
          expected_delivery_date: string | null
          id: string
          invoice_status: string
          notes: string | null
          order_date: string
          order_no: string
          order_status: string
          owner_name: string | null
          payment_status: string
          payment_terms: string | null
          project_id: string | null
          project_name: string | null
          purchase_request_id: string | null
          purchase_request_no: string | null
          quotation_ref: string | null
          quotation_total: number | null
          rejected_at: string | null
          rejected_by: string | null
          rejection_reason: string | null
          rfq_no: string | null
          sent_to_supplier_at: string | null
          submitted_for_approval_at: string | null
          subtotal: number
          supplier_id: string | null
          supplier_name: string
          total: number
          updated_at: string
          updated_by: string | null
          user_id: string
          vat_amount: number
          vat_rate: number
          version: number
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          approver_name?: string | null
          approver_user_id?: string | null
          budget_override_reason?: string | null
          cancelled_at?: string | null
          category?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          delivery_address?: string | null
          delivery_contact?: string | null
          delivery_status?: string
          discount?: number
          expected_delivery_date?: string | null
          id?: string
          invoice_status?: string
          notes?: string | null
          order_date?: string
          order_no: string
          order_status?: string
          owner_name?: string | null
          payment_status?: string
          payment_terms?: string | null
          project_id?: string | null
          project_name?: string | null
          purchase_request_id?: string | null
          purchase_request_no?: string | null
          quotation_ref?: string | null
          quotation_total?: number | null
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_reason?: string | null
          rfq_no?: string | null
          sent_to_supplier_at?: string | null
          submitted_for_approval_at?: string | null
          subtotal?: number
          supplier_id?: string | null
          supplier_name: string
          total?: number
          updated_at?: string
          updated_by?: string | null
          user_id: string
          vat_amount?: number
          vat_rate?: number
          version?: number
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          approver_name?: string | null
          approver_user_id?: string | null
          budget_override_reason?: string | null
          cancelled_at?: string | null
          category?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          delivery_address?: string | null
          delivery_contact?: string | null
          delivery_status?: string
          discount?: number
          expected_delivery_date?: string | null
          id?: string
          invoice_status?: string
          notes?: string | null
          order_date?: string
          order_no?: string
          order_status?: string
          owner_name?: string | null
          payment_status?: string
          payment_terms?: string | null
          project_id?: string | null
          project_name?: string | null
          purchase_request_id?: string | null
          purchase_request_no?: string | null
          quotation_ref?: string | null
          quotation_total?: number | null
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_reason?: string | null
          rfq_no?: string | null
          sent_to_supplier_at?: string | null
          submitted_for_approval_at?: string | null
          subtotal?: number
          supplier_id?: string | null
          supplier_name?: string
          total?: number
          updated_at?: string
          updated_by?: string | null
          user_id?: string
          vat_amount?: number
          vat_rate?: number
          version?: number
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          device_name: string | null
          endpoint: string
          id: string
          is_active: boolean
          p256dh: string
          updated_at: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          device_name?: string | null
          endpoint: string
          id?: string
          is_active?: boolean
          p256dh: string
          updated_at?: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          device_name?: string | null
          endpoint?: string
          id?: string
          is_active?: boolean
          p256dh?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      reminders: {
        Row: {
          assigned_to: string | null
          created_at: string
          done: boolean
          id: string
          note: string | null
          reminder_date: string
          title: string
          user_id: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          done?: boolean
          id?: string
          note?: string | null
          reminder_date: string
          title: string
          user_id: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          done?: boolean
          id?: string
          note?: string | null
          reminder_date?: string
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      site_diary_entries: {
        Row: {
          created_at: string
          crews: Json
          entry_date: string
          general_note: string | null
          id: string
          machines: Json
          materials: Json
          project_id: string
          special_events: Json
          status: string
          updated_at: string
          user_id: string
          weather_icon: string
          weather_temp: number | null
          work_done: string | null
          work_status: string
          work_stopped_reason: string | null
        }
        Insert: {
          created_at?: string
          crews?: Json
          entry_date?: string
          general_note?: string | null
          id?: string
          machines?: Json
          materials?: Json
          project_id: string
          special_events?: Json
          status?: string
          updated_at?: string
          user_id: string
          weather_icon?: string
          weather_temp?: number | null
          work_done?: string | null
          work_status?: string
          work_stopped_reason?: string | null
        }
        Update: {
          created_at?: string
          crews?: Json
          entry_date?: string
          general_note?: string | null
          id?: string
          machines?: Json
          materials?: Json
          project_id?: string
          special_events?: Json
          status?: string
          updated_at?: string
          user_id?: string
          weather_icon?: string
          weather_temp?: number | null
          work_done?: string | null
          work_status?: string
          work_stopped_reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "site_diary_entries_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      site_diary_photos: {
        Row: {
          created_at: string
          description: string | null
          diary_entry_id: string
          id: string
          photo_url: string
          sort_order: number
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          diary_entry_id: string
          id?: string
          photo_url: string
          sort_order?: number
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          diary_entry_id?: string
          id?: string
          photo_url?: string
          sort_order?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "site_diary_photos_diary_entry_id_fkey"
            columns: ["diary_entry_id"]
            isOneToOne: false
            referencedRelation: "site_diary_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_movements: {
        Row: {
          actor_id: string
          cost_code: string | null
          counter_warehouse_id: string | null
          created_at: string
          direction: number
          id: string
          material_id: string
          movement_no: string
          movement_type: string
          notes: string | null
          person: string | null
          posted_at: string
          project_id: string | null
          quantity: number
          reason: string | null
          reversal_of: string | null
          reversed_by: string | null
          source_document: string | null
          source_id: string | null
          source_type: string | null
          supplier: string | null
          total_cost: number | null
          transaction_date: string
          unit: string
          unit_cost: number | null
          user_id: string
          warehouse_id: string
        }
        Insert: {
          actor_id: string
          cost_code?: string | null
          counter_warehouse_id?: string | null
          created_at?: string
          direction: number
          id?: string
          material_id: string
          movement_no?: string
          movement_type: string
          notes?: string | null
          person?: string | null
          posted_at?: string
          project_id?: string | null
          quantity: number
          reason?: string | null
          reversal_of?: string | null
          reversed_by?: string | null
          source_document?: string | null
          source_id?: string | null
          source_type?: string | null
          supplier?: string | null
          total_cost?: number | null
          transaction_date?: string
          unit: string
          unit_cost?: number | null
          user_id: string
          warehouse_id: string
        }
        Update: {
          actor_id?: string
          cost_code?: string | null
          counter_warehouse_id?: string | null
          created_at?: string
          direction?: number
          id?: string
          material_id?: string
          movement_no?: string
          movement_type?: string
          notes?: string | null
          person?: string | null
          posted_at?: string
          project_id?: string | null
          quantity?: number
          reason?: string | null
          reversal_of?: string | null
          reversed_by?: string | null
          source_document?: string | null
          source_id?: string | null
          source_type?: string | null
          supplier?: string | null
          total_cost?: number | null
          transaction_date?: string
          unit?: string
          unit_cost?: number | null
          user_id?: string
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_counter_warehouse_id_fkey"
            columns: ["counter_warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_reversal_of_fkey"
            columns: ["reversal_of"]
            isOneToOne: false
            referencedRelation: "inventory_consumption"
            referencedColumns: ["source_movement_id"]
          },
          {
            foreignKeyName: "stock_movements_reversal_of_fkey"
            columns: ["reversal_of"]
            isOneToOne: false
            referencedRelation: "inventory_scrap"
            referencedColumns: ["source_movement_id"]
          },
          {
            foreignKeyName: "stock_movements_reversal_of_fkey"
            columns: ["reversal_of"]
            isOneToOne: false
            referencedRelation: "stock_movements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      subcontractor_payments: {
        Row: {
          account_no: string | null
          amount: number
          bank_name: string | null
          check_due_date: string | null
          check_no: string | null
          created_at: string
          description: string | null
          id: string
          note: string | null
          payment_date: string
          payment_method: string
          planned_date: string | null
          project_id: string | null
          receipt_url: string | null
          status: string
          subcontractor_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          account_no?: string | null
          amount?: number
          bank_name?: string | null
          check_due_date?: string | null
          check_no?: string | null
          created_at?: string
          description?: string | null
          id?: string
          note?: string | null
          payment_date?: string
          payment_method?: string
          planned_date?: string | null
          project_id?: string | null
          receipt_url?: string | null
          status?: string
          subcontractor_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          account_no?: string | null
          amount?: number
          bank_name?: string | null
          check_due_date?: string | null
          check_no?: string | null
          created_at?: string
          description?: string | null
          id?: string
          note?: string | null
          payment_date?: string
          payment_method?: string
          planned_date?: string | null
          project_id?: string | null
          receipt_url?: string | null
          status?: string
          subcontractor_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subcontractor_payments_subcontractor_id_fkey"
            columns: ["subcontractor_id"]
            isOneToOne: false
            referencedRelation: "subcontractors"
            referencedColumns: ["id"]
          },
        ]
      }
      subcontractors: {
        Row: {
          contact_person: string | null
          contract_amount: number
          created_at: string
          description: string | null
          id: string
          name: string
          notes: string | null
          payment_schedule: Json | null
          phone: string | null
          project_id: string | null
          project_ids: string[]
          specialty: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          contact_person?: string | null
          contract_amount?: number
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          notes?: string | null
          payment_schedule?: Json | null
          phone?: string | null
          project_id?: string | null
          project_ids?: string[]
          specialty?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          contact_person?: string | null
          contract_amount?: number
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          notes?: string | null
          payment_schedule?: Json | null
          phone?: string | null
          project_id?: string | null
          project_ids?: string[]
          specialty?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          assigned_to: string | null
          created_at: string
          created_by: string
          description: string | null
          due_date: string | null
          id: string
          priority: string | null
          project_id: string
          sort_order: number
          status: string
          team_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string | null
          project_id: string
          sort_order?: number
          status?: string
          team_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string | null
          project_id?: string
          sort_order?: number
          status?: string
          team_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "office_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      trial_claims: {
        Row: {
          claimed_at: string
          email_normalized: string
          id: string
          user_id: string | null
        }
        Insert: {
          claimed_at?: string
          email_normalized: string
          id?: string
          user_id?: string | null
        }
        Update: {
          claimed_at?: string
          email_normalized?: string
          id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      unit_dimensions: {
        Row: {
          base_unit: string
          dimension: string
          to_base: number
          unit: string
        }
        Insert: {
          base_unit: string
          dimension: string
          to_base?: number
          unit: string
        }
        Update: {
          base_unit?: string
          dimension?: string
          to_base?: number
          unit?: string
        }
        Relationships: []
      }
      usage_audit_log: {
        Row: {
          created_at: string
          delta: number
          id: string
          metric_key: string
          owner_id: string | null
          reason: string | null
          team_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          delta?: number
          id?: string
          metric_key: string
          owner_id?: string | null
          reason?: string | null
          team_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          delta?: number
          id?: string
          metric_key?: string
          owner_id?: string | null
          reason?: string | null
          team_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "usage_audit_log_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "office_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "usage_audit_log_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      usage_counters: {
        Row: {
          id: string
          metric_key: string
          owner_id: string
          period_start: string
          team_id: string | null
          updated_at: string
          value: number
        }
        Insert: {
          id?: string
          metric_key: string
          owner_id: string
          period_start: string
          team_id?: string | null
          updated_at?: string
          value?: number
        }
        Update: {
          id?: string
          metric_key?: string
          owner_id?: string
          period_start?: string
          team_id?: string | null
          updated_at?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "usage_counters_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "office_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "usage_counters_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      user_calculations: {
        Row: {
          calc_title: string
          calc_type: string
          created_at: string
          id: string
          input_data: Json
          result_data: Json
          user_id: string
        }
        Insert: {
          calc_title: string
          calc_type: string
          created_at?: string
          id?: string
          input_data?: Json
          result_data?: Json
          user_id: string
        }
        Update: {
          calc_title?: string
          calc_type?: string
          created_at?: string
          id?: string
          input_data?: Json
          result_data?: Json
          user_id?: string
        }
        Relationships: []
      }
      user_cards: {
        Row: {
          bin_number: string | null
          card_alias: string
          card_association: string
          card_bank_name: string | null
          card_token: string
          card_type: string
          card_user_key: string
          created_at: string
          id: string
          is_default: boolean
          last_four_digits: string
          updated_at: string
          user_id: string
        }
        Insert: {
          bin_number?: string | null
          card_alias?: string
          card_association?: string
          card_bank_name?: string | null
          card_token: string
          card_type?: string
          card_user_key: string
          created_at?: string
          id?: string
          is_default?: boolean
          last_four_digits?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          bin_number?: string | null
          card_alias?: string
          card_association?: string
          card_bank_name?: string | null
          card_token?: string
          card_type?: string
          card_user_key?: string
          created_at?: string
          id?: string
          is_default?: boolean
          last_four_digits?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_renders: {
        Row: {
          created_at: string
          id: string
          prompt: string
          result_image_url: string | null
          result_text: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          prompt: string
          result_image_url?: string | null
          result_text?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          prompt?: string
          result_image_url?: string | null
          result_text?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_subscriptions: {
        Row: {
          amount: number
          cancelled_at: string | null
          card_token: string | null
          card_user_key: string | null
          created_at: string
          downgraded_at: string | null
          id: string
          iyzico_payment_id: string | null
          last_payment_date: string | null
          next_payment_date: string | null
          plan_name: string
          reminder_sent: boolean
          status: string
          subscription_type: string
          trial_consumed: boolean
          trial_end: string
          trial_plan: string
          trial_start: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number
          cancelled_at?: string | null
          card_token?: string | null
          card_user_key?: string | null
          created_at?: string
          downgraded_at?: string | null
          id?: string
          iyzico_payment_id?: string | null
          last_payment_date?: string | null
          next_payment_date?: string | null
          plan_name: string
          reminder_sent?: boolean
          status?: string
          subscription_type?: string
          trial_consumed?: boolean
          trial_end?: string
          trial_plan?: string
          trial_start?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          cancelled_at?: string | null
          card_token?: string | null
          card_user_key?: string | null
          created_at?: string
          downgraded_at?: string | null
          id?: string
          iyzico_payment_id?: string | null
          last_payment_date?: string | null
          next_payment_date?: string | null
          plan_name?: string
          reminder_sent?: boolean
          status?: string
          subscription_type?: string
          trial_consumed?: boolean
          trial_end?: string
          trial_plan?: string
          trial_start?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      voice_usage: {
        Row: {
          created_at: string
          id: string
          seconds_used: number
          updated_at: string
          usage_date: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          seconds_used?: number
          updated_at?: string
          usage_date?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          seconds_used?: number
          updated_at?: string
          usage_date?: string
          user_id?: string
        }
        Relationships: []
      }
      warehouses: {
        Row: {
          capacity_type: string | null
          capacity_unit: string | null
          capacity_value: number | null
          code: string
          created_at: string
          id: string
          is_active: boolean
          location: string | null
          manager_name: string | null
          name: string
          notes: string | null
          project_id: string | null
          updated_at: string
          user_id: string
          warehouse_type: string
        }
        Insert: {
          capacity_type?: string | null
          capacity_unit?: string | null
          capacity_value?: number | null
          code: string
          created_at?: string
          id?: string
          is_active?: boolean
          location?: string | null
          manager_name?: string | null
          name: string
          notes?: string | null
          project_id?: string | null
          updated_at?: string
          user_id: string
          warehouse_type?: string
        }
        Update: {
          capacity_type?: string | null
          capacity_unit?: string | null
          capacity_value?: number | null
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          location?: string | null
          manager_name?: string | null
          name?: string
          notes?: string | null
          project_id?: string | null
          updated_at?: string
          user_id?: string
          warehouse_type?: string
        }
        Relationships: []
      }
      worker_attendance: {
        Row: {
          check_in: string
          check_out: string | null
          created_at: string
          duration_minutes: number | null
          entry_type: string
          foreman_name: string | null
          full_name: string
          id: string
          occupation: string
          phone: string | null
          project_id: string
          qr_token: string
          team_size: number | null
          title: string | null
          user_id: string
        }
        Insert: {
          check_in?: string
          check_out?: string | null
          created_at?: string
          duration_minutes?: number | null
          entry_type?: string
          foreman_name?: string | null
          full_name: string
          id?: string
          occupation?: string
          phone?: string | null
          project_id: string
          qr_token: string
          team_size?: number | null
          title?: string | null
          user_id: string
        }
        Update: {
          check_in?: string
          check_out?: string | null
          created_at?: string
          duration_minutes?: number | null
          entry_type?: string
          foreman_name?: string | null
          full_name?: string
          id?: string
          occupation?: string
          phone?: string | null
          project_id?: string
          qr_token?: string
          team_size?: number | null
          title?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "worker_attendance_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      inventory_balances: {
        Row: {
          avg_cost: number | null
          last_movement_date: string | null
          material_id: string | null
          movement_count: number | null
          on_hand: number | null
          total_in: number | null
          total_out: number | null
          user_id: string | null
          warehouse_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_consumption: {
        Row: {
          base_unit: string | null
          company_id: string | null
          consumption_quantity: number | null
          consumption_type: string | null
          cost_code: string | null
          material_id: string | null
          movement_date: string | null
          person: string | null
          project_id: string | null
          source_movement_id: string | null
          unit_cost: number | null
          warehouse_id: string | null
        }
        Insert: {
          base_unit?: string | null
          company_id?: string | null
          consumption_quantity?: number | null
          consumption_type?: string | null
          cost_code?: string | null
          material_id?: string | null
          movement_date?: string | null
          person?: string | null
          project_id?: string | null
          source_movement_id?: string | null
          unit_cost?: number | null
          warehouse_id?: string | null
        }
        Update: {
          base_unit?: string | null
          company_id?: string | null
          consumption_quantity?: number | null
          consumption_type?: string | null
          cost_code?: string | null
          material_id?: string | null
          movement_date?: string | null
          person?: string | null
          project_id?: string | null
          source_movement_id?: string | null
          unit_cost?: number | null
          warehouse_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_scrap: {
        Row: {
          base_unit: string | null
          company_id: string | null
          material_id: string | null
          movement_date: string | null
          project_id: string | null
          reason: string | null
          scrap_quantity: number | null
          scrap_type: string | null
          source_movement_id: string | null
          unit_cost: number | null
          warehouse_id: string | null
        }
        Insert: {
          base_unit?: string | null
          company_id?: string | null
          material_id?: string | null
          movement_date?: string | null
          project_id?: string | null
          reason?: string | null
          scrap_quantity?: number | null
          scrap_type?: string | null
          source_movement_id?: string | null
          unit_cost?: number | null
          warehouse_id?: string | null
        }
        Update: {
          base_unit?: string | null
          company_id?: string | null
          material_id?: string | null
          movement_date?: string | null
          project_id?: string | null
          reason?: string | null
          scrap_quantity?: number | null
          scrap_type?: string | null
          source_movement_id?: string | null
          unit_cost?: number | null
          warehouse_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_transit_balances: {
        Row: {
          direction: string | null
          material_id: string | null
          quantity: number | null
          transfer_count: number | null
          warehouse_id: string | null
        }
        Relationships: []
      }
      organizations: {
        Row: {
          created_at: string | null
          id: string | null
          internal_plan_key: string | null
          name: string | null
          owner_id: string | null
          plan_display: string | null
          public_plan: string | null
        }
        Relationships: []
      }
      unmatched_qr_checkins: {
        Row: {
          check_in: string | null
          entry_type: string | null
          full_name: string | null
          occupation: string | null
          phone: string | null
          project_id: string | null
          title: string | null
          user_id: string | null
          worker_attendance_id: string | null
        }
        Insert: {
          check_in?: string | null
          entry_type?: string | null
          full_name?: string | null
          occupation?: string | null
          phone?: string | null
          project_id?: string | null
          title?: string | null
          user_id?: string | null
          worker_attendance_id?: string | null
        }
        Update: {
          check_in?: string | null
          entry_type?: string | null
          full_name?: string | null
          occupation?: string | null
          phone?: string | null
          project_id?: string | null
          title?: string | null
          user_id?: string | null
          worker_attendance_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "worker_attendance_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      accept_project_invitation: { Args: { _token: string }; Returns: string }
      add_voice_usage_seconds: { Args: { _seconds: number }; Returns: number }
      approve_stock_transfer: {
        Args: { _decision: string; _reason?: string; _transfer_id: string }
        Returns: Json
      }
      assert_depot_permission: { Args: { _key: string }; Returns: undefined }
      bulk_upsert_attendance: { Args: { _records: Json }; Returns: number }
      can_access_project: {
        Args: { _project: string; _user: string }
        Returns: boolean
      }
      can_access_team_resource: {
        Args: { _accessor_id: string; _owner_id: string }
        Returns: boolean
      }
      cancel_stock_transfer: {
        Args: { _reason: string; _transfer_id: string }
        Returns: Json
      }
      check_feature: { Args: { _key: string }; Returns: boolean }
      check_pending_invitations: {
        Args: { _email: string; _user_id: string }
        Returns: undefined
      }
      check_quota: { Args: { _key: string }; Returns: Json }
      claim_due_communications: {
        Args: { _limit?: number }
        Returns: {
          attachments: Json
          bcc: Json
          body: string
          cc: Json
          channel: Database["public"]["Enums"]["comm_channel"]
          created_at: string
          created_from: string | null
          delivered_at: string | null
          email_account_id: string | null
          error: string | null
          error_code: string | null
          failed_at: string | null
          id: string
          max_retries: number
          media_caption: string | null
          media_url: string | null
          message_type: string
          metadata: Json
          next_retry_at: string | null
          opened_at: string | null
          priority: Database["public"]["Enums"]["comm_priority"]
          processing_started_at: string | null
          project_id: string | null
          provider: string | null
          provider_message_id: string | null
          read_at: string | null
          recipient: string
          recipient_name: string | null
          related_action: string | null
          retry_count: number
          scheduled_at: string | null
          sent_at: string | null
          status: Database["public"]["Enums"]["comm_status"]
          subject: string | null
          template_language: string | null
          template_name: string | null
          template_variables: Json
          updated_at: string
          user_id: string
        }[]
        SetofOptions: {
          from: "*"
          to: "communication_messages"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      company_health_access: { Args: never; Returns: Json }
      compute_project_labor_cost: {
        Args: { _month: string; _project: string }
        Returns: Json
      }
      create_stock_transfer: {
        Args: {
          _allow_safety_breach?: boolean
          _dest_warehouse_id: string
          _material_id: string
          _notes?: string
          _project_id?: string
          _reason?: string
          _requested_quantity: number
          _required_at?: string
          _source_warehouse_id: string
          _unit?: string
        }
        Returns: Json
      }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      delete_subcontractor_payment_with_cash: {
        Args: { _payment_id: string }
        Returns: undefined
      }
      delete_transfer_document: {
        Args: { _document_id: string; _reason?: string }
        Returns: boolean
      }
      depot_permission: { Args: { _key: string }; Returns: boolean }
      dispatch_stock_transfer: {
        Args: {
          _dispatched_at?: string
          _dispatched_quantity: number
          _expected_arrival_at?: string
          _notes?: string
          _reference?: string
          _transfer_id: string
          _unit?: string
        }
        Returns: Json
      }
      email_queue_dispatch: { Args: never; Returns: undefined }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      ensure_default_warehouse: { Args: never; Returns: string }
      expire_trials: { Args: never; Returns: number }
      get_account_usage: { Args: never; Returns: Json }
      get_company_health: { Args: never; Returns: Json }
      get_hakedis_by_approval_token: { Args: { _token: string }; Returns: Json }
      get_org_plan_summary: { Args: never; Returns: Json }
      get_project_name_by_qr_token: {
        Args: { _token: string }
        Returns: string
      }
      get_project_role: {
        Args: { _project: string; _user: string }
        Returns: Database["public"]["Enums"]["project_role"]
      }
      get_signature_request_by_token: {
        Args: { _token: string }
        Returns: {
          contract_counterparty: string
          contract_file_name: string
          contract_file_url: string
          contract_id: string
          contract_name: string
          deadline: string
          id: string
          message: string
          recipient_email: string
          recipient_name: string
          sent_at: string
          signed_at: string
          status: string
        }[]
      }
      get_trial_status: { Args: never; Returns: Json }
      get_user_team_id: { Args: { _user_id: string }; Returns: string }
      has_project_permission: {
        Args: { _key: string; _project: string; _user: string }
        Returns: boolean
      }
      increment_usage: {
        Args: { _delta?: number; _metric: string; _reason?: string }
        Returns: number
      }
      inv_stock_position: {
        Args: { _material_id: string; _warehouse_id: string }
        Returns: {
          available: number
          on_hand: number
          reserved: number
        }[]
      }
      inv_transfer_event: {
        Args: {
          _action: string
          _note: string
          _owner: string
          _payload: Json
          _status: string
          _transfer_id: string
        }
        Returns: string
      }
      inv_transfer_notify: {
        Args: {
          _body: string
          _event: string
          _title: string
          _transfer_id: string
        }
        Returns: undefined
      }
      inv_unit_factor: {
        Args: { _material_id: string; _unit: string }
        Returns: number
      }
      is_member_suspended: { Args: { _user_id: string }; Returns: boolean }
      is_project_manager_or_owner: {
        Args: { _project: string; _user: string }
        Returns: boolean
      }
      is_project_owner: {
        Args: { _project: string; _user: string }
        Returns: boolean
      }
      is_same_team: {
        Args: { _user_id_a: string; _user_id_b: string }
        Returns: boolean
      }
      list_attendance_by_qr_range: {
        Args: { _from_date: string; _to_date: string; _token: string }
        Returns: {
          check_in: string
          check_out: string
          duration_minutes: number
          entry_type: string
          foreman_name: string
          full_name: string
          id: string
          occupation: string
          phone: string
          project_id: string
          project_name: string
          team_size: number
          title: string
        }[]
      }
      list_signed_uploads_by_token: {
        Args: { _token: string }
        Returns: {
          created_at: string
          file_name: string
          file_size: number
          file_url: string
          id: string
          signature_request_id: string
          signer_name: string
          signer_title: string
        }[]
      }
      list_today_workers_by_qr: {
        Args: { _token: string }
        Returns: {
          check_in: string
          check_out: string
          duration_minutes: number
          entry_type: string
          foreman_name: string
          full_name: string
          id: string
          occupation: string
          project_id: string
          team_size: number
          title: string
        }[]
      }
      log_company_health_access: {
        Args: { _action?: string; _section: string }
        Returns: undefined
      }
      match_company_memories: {
        Args: {
          _match_count?: number
          _min_similarity?: number
          _query_embedding: string
          _type?: Database["public"]["Enums"]["memory_type"]
          _user_id: string
        }
        Returns: {
          confidence: number
          content: string
          id: string
          metadata: Json
          pinned: boolean
          similarity: number
          source: string
          title: string
          type: Database["public"]["Enums"]["memory_type"]
          updated_at: string
        }[]
      }
      match_document_chunks: {
        Args: {
          _date_from?: string
          _date_to?: string
          _doc_type?: string
          _language?: string
          _match_count?: number
          _min_similarity?: number
          _project_id?: string
          _query_embedding: string
          _query_text?: string
          _supplier?: string
          _tags?: string[]
          _user_id: string
        }
        Returns: {
          chunk_id: string
          content: string
          doc_type: string
          document_id: string
          document_name: string
          fts_rank: number
          is_global: boolean
          page_number: number
          pinned: boolean
          score: number
          similarity: number
          supplier: string
          tags: string[]
        }[]
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      normalize_phone: { Args: { _p: string }; Returns: string }
      post_goods_receipt: {
        Args: {
          _manual?: boolean
          _material_id: string
          _notes?: string
          _project_id?: string
          _quantity: number
          _reason?: string
          _source_document?: string
          _source_id?: string
          _source_type?: string
          _supplier?: string
          _transaction_date?: string
          _unit: string
          _unit_cost?: number
          _warehouse_id: string
        }
        Returns: string
      }
      post_stock_issue: {
        Args: {
          _cost_code?: string
          _material_id: string
          _movement_type?: string
          _notes?: string
          _person?: string
          _project_id?: string
          _quantity: number
          _reason?: string
          _source_document?: string
          _source_id?: string
          _source_type?: string
          _transaction_date?: string
          _unit: string
          _warehouse_id: string
        }
        Returns: string
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      receive_stock_transfer: {
        Args: {
          _accepted_quantity?: number
          _damaged_quantity?: number
          _missing_quantity?: number
          _notes?: string
          _received_at?: string
          _reference?: string
          _rejected_quantity?: number
          _transfer_id: string
          _unit?: string
        }
        Returns: Json
      }
      record_signed_upload: {
        Args: {
          _file_name: string
          _file_size: number
          _file_url: string
          _signer_name: string
          _signer_title: string
          _token: string
        }
        Returns: string
      }
      recover_stale_communications: {
        Args: { _older_than_minutes?: number }
        Returns: number
      }
      register_transfer_document: {
        Args: {
          _doc_type?: string
          _file_name: string
          _file_path: string
          _file_size: number
          _mime_type: string
          _transfer_id: string
        }
        Returns: string
      }
      remove_project_member: {
        Args: { _project: string; _user: string }
        Returns: undefined
      }
      resolve_billing_owner: { Args: { _user: string }; Returns: string }
      resolve_org_plan: {
        Args: { _user: string }
        Returns: {
          display_name: string
          internal_plan: string
          public_plan: string
          team_id: string
        }[]
      }
      return_stock_transfer: {
        Args: {
          _quantity: number
          _reason: string
          _transfer_id: string
          _unit?: string
        }
        Returns: Json
      }
      reverse_stock_movement: {
        Args: { _movement_id: string; _reason: string }
        Returns: string
      }
      role_default_permission: {
        Args: {
          _key: string
          _role: Database["public"]["Enums"]["project_role"]
        }
        Returns: boolean
      }
      save_subcontractor_payment_with_cash: {
        Args: {
          _account_no: string
          _amount: number
          _bank_name: string
          _check_due_date: string
          _check_no: string
          _note: string
          _payment_date: string
          _payment_id: string
          _payment_method: string
          _project_id: string
          _recipient: string
          _subcontractor_id: string
        }
        Returns: string
      }
      set_project_member_permission: {
        Args: {
          _granted: boolean
          _key: string
          _project: string
          _user: string
        }
        Returns: undefined
      }
      set_project_member_role: {
        Args: {
          _project: string
          _role: Database["public"]["Enums"]["project_role"]
          _user: string
        }
        Returns: undefined
      }
      touch_documents_used: { Args: { _doc_ids: string[] }; Returns: undefined }
      touch_memories_used: { Args: { _ids: string[] }; Returns: undefined }
      update_hakedis_approval: {
        Args: {
          _approval_status: string
          _client_note?: string
          _token: string
        }
        Returns: boolean
      }
      validate_qr_token: {
        Args: { _token: string }
        Returns: {
          expires_at: string
          project_id: string
          project_name: string
          user_id: string
        }[]
      }
      worker_check_in:
        | {
            Args: {
              _entry_type: string
              _foreman_name: string
              _full_name: string
              _occupation: string
              _team_size: number
              _title: string
              _token: string
            }
            Returns: string
          }
        | {
            Args: {
              _entry_type: string
              _foreman_name: string
              _full_name: string
              _occupation: string
              _phone?: string
              _team_size: number
              _title: string
              _token: string
            }
            Returns: string
          }
      worker_check_out: {
        Args: { _attendance_id: string; _token: string }
        Returns: boolean
      }
    }
    Enums: {
      attendance_source: "manual" | "qr"
      attendance_status: "full_day" | "half_day" | "absent" | "leave"
      comm_channel: "whatsapp" | "email" | "sms" | "push" | "teams" | "slack"
      comm_priority: "low" | "normal" | "high" | "urgent"
      comm_status:
        | "draft"
        | "pending_approval"
        | "scheduled"
        | "queued"
        | "sending"
        | "sent"
        | "failed"
        | "cancelled"
        | "processing"
        | "retrying"
        | "manual_action_required"
      email_account_status: "active" | "disabled" | "error" | "unverified"
      email_provider:
        | "smtp"
        | "microsoft_graph"
        | "gmail"
        | "sendgrid"
        | "ses"
        | "mailgun"
        | "lovable"
      employment_type: "daily_wage" | "monthly_salary" | "subcontractor_crew"
      memory_type:
        | "company"
        | "project"
        | "personnel"
        | "supplier"
        | "decision"
        | "preference"
        | "other"
      project_role:
        | "owner"
        | "manager"
        | "site_engineer"
        | "accountant"
        | "subcontractor"
        | "worker"
        | "landowner"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      attendance_source: ["manual", "qr"],
      attendance_status: ["full_day", "half_day", "absent", "leave"],
      comm_channel: ["whatsapp", "email", "sms", "push", "teams", "slack"],
      comm_priority: ["low", "normal", "high", "urgent"],
      comm_status: [
        "draft",
        "pending_approval",
        "scheduled",
        "queued",
        "sending",
        "sent",
        "failed",
        "cancelled",
        "processing",
        "retrying",
        "manual_action_required",
      ],
      email_account_status: ["active", "disabled", "error", "unverified"],
      email_provider: [
        "smtp",
        "microsoft_graph",
        "gmail",
        "sendgrid",
        "ses",
        "mailgun",
        "lovable",
      ],
      employment_type: ["daily_wage", "monthly_salary", "subcontractor_crew"],
      memory_type: [
        "company",
        "project",
        "personnel",
        "supplier",
        "decision",
        "preference",
        "other",
      ],
      project_role: [
        "owner",
        "manager",
        "site_engineer",
        "accountant",
        "subcontractor",
        "worker",
        "landowner",
      ],
    },
  },
} as const
