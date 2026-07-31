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
          created_at: string
          id: string
          min_stock: number
          name: string
          project_id: string
          unit: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          min_stock?: number
          name?: string
          project_id: string
          unit?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          min_stock?: number
          name?: string
          project_id?: string
          unit?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
      bulk_upsert_attendance: { Args: { _records: Json }; Returns: number }
      can_access_project: {
        Args: { _project: string; _user: string }
        Returns: boolean
      }
      can_access_team_resource: {
        Args: { _accessor_id: string; _owner_id: string }
        Returns: boolean
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
      compute_project_labor_cost: {
        Args: { _month: string; _project: string }
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
      email_queue_dispatch: { Args: never; Returns: undefined }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      expire_trials: { Args: never; Returns: number }
      get_account_usage: { Args: never; Returns: Json }
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
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
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
